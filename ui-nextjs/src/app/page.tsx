import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kancelaria</h1>
              <p className="text-gray-600 mt-1">System Fakturowania</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Profesjonalne rozwiązanie</p>
              <p className="text-xs text-gray-400">dla Twojej kancelarii</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Profesjonalne Faktury dla Kancelarii
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Nowoczesna aplikacja do wystawiania faktur zgodnych z wymogami polskiego prawa,
            stworzona specjalnie dla kancelarii prawnych i firm usługowych.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <QuickActionCard
            href="/invoices/new"
            icon="📝"
            title="Nowa Faktura"
            description="Stwórz profesjonalną fakturę w kilka minut"
            color="blue"
          />
          <QuickActionCard
            href="/invoices"
            icon="📋"
            title="Lista Faktur"
            description="Przeglądaj i zarządzaj wszystkimi dokumentami"
            color="green"
          />
          <QuickActionCard
            href="/settings"
            icon="⚙️"
            title="Ustawienia"
            description="Skonfiguruj dane firmy i preferencje"
            color="gray"
          />
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Główne Funkcje</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureItem
              icon="✅"
              title="Zgodne z Polskim Prawem"
              description="Wszystkie faktury zgodne z wymogami MF"
            />
            <FeatureItem
              icon="💾"
              title="Automatyczne Zapisy"
              description="Dane zapisywane lokalnie w przeglądarce"
            />
            <FeatureItem
              icon="📱"
              title="Responsive Design"
              description="Działa na każdym urządzeniu"
            />
            <FeatureItem
              icon="🔒"
              title="Bezpieczeństwo Danych"
              description="Dane przetwarzane lokalnie"
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Gotowy do pracy?</h3>
            <p className="text-blue-100 mb-6">
              Rozpocznij wystawiać profesjonalne faktury już dzisiaj
            </p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Stwórz Pierwszą Fakturę
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 Kancelaria Faktury. Wszystkie prawa zastrzeżone.</p>
            <p className="text-sm text-gray-500 mt-2">
              Profesjonalne oprogramowanie dla nowoczesnej kancelarii
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  href,
  icon,
  title,
  description,
  color
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 group-hover:border-blue-300',
    green: 'bg-green-50 hover:bg-green-100 border-green-200 group-hover:border-green-300',
    gray: 'bg-gray-50 hover:bg-gray-100 border-gray-200 group-hover:border-gray-300'
  };

  return (
    <Link
      href={href}
      className={`group block p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
      <div className="mt-4 text-sm font-medium text-gray-700 group-hover:text-gray-900">
        Rozpocznij →
      </div>
    </Link>
  );
}

// Feature Item Component
function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
