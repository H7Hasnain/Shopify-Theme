import { UrbanHeader } from "./components/UrbanHeader";
import { LocationPopup } from "./components/LocationPopup";
import { TravelFooter } from "./components/TravelFooter";
import { PageRenderer } from "./components/PageRenderer";
import { RouterProvider, useRouter } from "./components/Router";
import { useAppState } from "./components/AppState";
import { Toaster } from "./components/ui/sonner";

function AppContent() {
  const router = useRouter();
  const [state, actions] = useAppState();

  const isCheckoutPage = router.currentPage.startsWith("checkout");
  const showBackButton = router.currentPage !== "home";

  return (
    <div className="min-h-screen bg-background">
      {/* Location Detection Popup */}
      <LocationPopup 
        isOpen={state.showLocationPopup}
        onClose={actions.handleLocationPopupClose}
        onRegionSelect={actions.handleRegionSelect}
        detectedRegion={state.currentRegion}
      />

      {/* Header */}
      <UrbanHeader 
        cartItemsCount={state.cartItems}
        currentRegion={state.currentRegion}
        currentLanguage={state.currentLanguage}
        currentCurrency={state.currentCurrency}
        currencySymbol={state.currencySymbol}
        onRegionChange={actions.setCurrentRegion}
        onLanguageChange={actions.setCurrentLanguage}
        showBackButton={showBackButton}
        wishlistCount={state.wishlistCount}
        notificationCount={state.notificationCount}
        trackOrderCount={state.trackOrderCount}
      />

      {/* Main Content */}
      <main>
        <PageRenderer />
      </main>

      {/* Footer - Hidden on checkout pages */}
      {!isCheckoutPage && <TravelFooter />}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}