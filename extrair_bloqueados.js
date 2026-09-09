const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Números que NUNCA devem ser bloqueados (whitelist)
const WHITELIST = new Set([
    '5511940569803',  // seu número
    '5511966708589',  // Leilane Camilla (substitua pelo número correto)
]);

const numerosBloqueados = new Set();

function extrairNumerosDoCSV(caminho) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(caminho)) {
            console.log(`⚠️ Arquivo não encontrado: ${caminho}`);
            resolve();
            return;
        }
        
        fs.createReadStream(caminho)
            .pipe(csv())
            .on('data', (row) => {
                const colunasTelefone = ['Phone 1 - Value', 'Mobile', 'Celular', 'Phone', 'Telefone'];
                
                for (const col of colunasTelefone) {
                    if (row[col]) {
                        let numero = row[col].toString().replace(/\D/g, '');
                        if (numero.length >= 10 && numero.length <= 13) {
                            if (numero.startsWith('55')) numero = numero.substring(2);
                            const numeroFormatado = '55' + numero;
                            
                            // Não adiciona se estiver na whitelist
                            if (!WHITELIST.has(numeroFormatado)) {
                                numerosBloqueados.add(numeroFormatado);
                            }
                        }
                    }
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });
}

async function main() {
    console.log('📂 Extraindo números dos CSVs...');
    
    await extrairNumerosDoCSV('contacts (1).csv');
    await extrairNumerosDoCSV('contacts.csv');
    
    const bloqueados = {
        numeros: Array.from(numerosBloqueados),
        total: numerosBloqueados.size,
        data_atualizacao: new Date().toISOString(),
        whitelist: Array.from(WHITELIST)
    };
    
    fs.writeFileSync('bloqueados.json', JSON.stringify(bloqueados, null, 2));
    console.log(`✅ ${bloqueados.total} números bloqueados salvos em bloqueados.json`);
    console.log(`✅ Whitelist: ${bloqueados.whitelist.length} números nunca serão bloqueados`);
}

main().catch(console.error);