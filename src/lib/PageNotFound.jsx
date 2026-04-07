import { useLocation, Link } from 'react-router-dom';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="space-y-2">
                    <div className="text-5xl font-mono text-muted-foreground/20">◈</div>
                    <h1 className="text-6xl font-mono font-light text-muted-foreground/30">404</h1>
                    <div className="h-px w-16 bg-border mx-auto" />
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-lg font-mono font-medium text-foreground">
                        Página no encontrada
                    </h2>
                    <p className="text-sm font-mono text-muted-foreground">
                        La ruta <span className="text-foreground">"{pageName}"</span> no existe.
                    </p>
                </div>
                
                <div className="pt-4">
                    <Link 
                        to="/"
                        className="inline-flex items-center px-4 py-2 text-xs font-mono uppercase tracking-wider text-foreground bg-secondary border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                        ← Volver al dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}