/**
 * Extrai CEP de texto livre e consulta ViaCEP (sem dependencia extra).
 */

function extractCep(text) {
    if (!text) return null;
    const clean = String(text).replace(/\D/g, '');
    // tenta achar sequencia de 8 digitos
    const match = clean.match(/(\d{8})/);
    return match ? match[1] : null;
}

async function searchAddress(cep) {
    try {
        const digits = String(cep).replace(/\D/g, '');
        if (digits.length !== 8) return null;

        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.erro) return null;

        return {
            cep: data.cep,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
            raw: data,
        };
    } catch (error) {
        console.error('[CEP] Erro na consulta:', error.message);
        return null;
    }
}

module.exports = { extractCep, searchAddress };
