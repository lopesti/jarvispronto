const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Whitelist de números que NUNCA devem ser bloqueados.
// Lida de whitelist.local.json (não versionado — contém números reais).
// Se o arquivo não existir, o script aborta com instrução.
const WHITELIST_PATH = path.join(__dirname, 'whitelist.local.json');

function carregarWhitelist() {
    if (!fs.existsSync(WHITELIST_PATH)) {
        console.error(`Arquivo de whitelist não encontrado: ${WHITELIST_PATH}`);
        console.error('Crie o arquivo com o formato:');
        console.error('  { "numeros": ["5511999999999", "5511888888888"] }');
        console.error('Veja scripts/whitelist.example.json para referência.');
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(WHITELIST_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.numeros)) {
            throw new Error('Campo "numeros" ausente ou não é array');
        }
        return new Set(parsed.numeros);
    } catch (err) {
        console.error(`Erro ao ler whitelist: ${err.message}`);
        process.exit(1);
    }
}

const WHITELIST = carregarWhitelist();

const numerosBloqueados = new Set();

function extrairNumerosDoCSV(caminho) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(caminho)) {
            console.log(`⚠️  Arquivo não encontrado: ${caminho}`);
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
    };

    fs.writeFileSync('bloqueados.json', JSON.stringify(bloqueados, null, 2));
    console.log(`✅ ${bloqueados.total} números bloqueados salvos em bloqueados.json`);
    console.log(`✅ Whitelist: ${WHITELIST.size} números nunca serão bloqueados`);
}

main().catch(console.error);