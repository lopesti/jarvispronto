export default function HomePage() {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>🏠 Jarvis Pronto</h1>
            <p>Sistema de gestão</p>
            <nav>
                <a href='/pizzaria' style={{ color: 'blue', textDecoration: 'underline' }}>
                    🍕 Ir para Pizzaria
                </a>
            </nav>
        </div>
    );
}
