import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '@/store';
import { Toaster } from '@/components/ui';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AppShell } from '@/layouts/AppShell';

import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { ProgramLandingPage } from '@/pages/ProgramLandingPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { HomePage } from '@/pages/HomePage';
import { ChoosePathPage } from '@/pages/ChoosePathPage';
import { AddContentPage } from '@/pages/AddContentPage';
import { BuildingPage } from '@/pages/BuildingPage';
import { ProgramPage } from '@/pages/ProgramPage';
import { LandingStudioPage } from '@/pages/LandingStudioPage';
import { MarketingKitPage } from '@/pages/MarketingKitPage';
import { LiveSessionsPage } from '@/pages/LiveSessionsPage';
import { GetPaidPage } from '@/pages/GetPaidPage';
import { MindsetPage } from '@/pages/MindsetPage';
import { CirclePage } from '@/pages/CirclePage';
import { AccountPage } from '@/pages/AccountPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { HelpPage } from '@/pages/HelpPage';
import { FaqPage } from '@/pages/FaqPage';
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/pages/legal/TermsOfServicePage';
import { CookiePolicyPage } from '@/pages/legal/CookiePolicyPage';
import { DeliveryPolicyPage } from '@/pages/legal/DeliveryPolicyPage';
import { RefundPolicyPage } from '@/pages/legal/RefundPolicyPage';

export default function App() {
  const init = useApp((s) => s.init);
  useEffect(() => { void init(); }, [init]);

  return (
    <>
      <Routes>
        {/* PUBLIC — no auth, no tab bar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          {/* Public program landing page — the link a creator shares to sell. */}
          <Route path="/p/:programId" element={<ProgramLandingPage />} />
          {/* Frequently Asked Questions */}
          <Route path="/faq" element={<FaqPage />} />
          {/* Legal policies */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/delivery" element={<DeliveryPolicyPage />} />
          <Route path="/refunds" element={<RefundPolicyPage />} />
          {/*
            The mentor's short URL — abundanceai.net/laquelle. Declared last for
            readability only: React Router ranks static segments above dynamic
            ones, so every path above still wins regardless of order. Any new
            top-level public route must also be added to reserved_slug() in
            supabase/migrations/0037_profile_slug.sql and to the passthrough
            rule in vercel.json, or it will be shadowed in production.

            This also makes ProgramLandingPage the 404 for unknown one-segment
            paths, which is why its not-found state offers a way home.
          */}
          <Route path="/:slug" element={<ProgramLandingPage />} />
        </Route>

        {/* APP — auth required, app shell + bottom tab bar */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="program" element={<ProgramPage />} />
          {/* Landing Studio — customize the public /p/:id page's look & copy. */}
          <Route path="landing" element={<LandingStudioPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="mindset" element={<MindsetPage />} />
          <Route path="circle" element={<CirclePage />} />
          <Route path="help" element={<HelpPage />} />
          {/* Onboarding (linear, resumable stepper) */}
          <Route path="onboarding/path" element={<ChoosePathPage />} />
          <Route path="onboarding/content" element={<AddContentPage />} />
          <Route path="onboarding/building" element={<BuildingPage />} />
          <Route path="onboarding/marketing" element={<MarketingKitPage />} />
          <Route path="onboarding/sessions" element={<LiveSessionsPage />} />
          <Route path="onboarding/payments" element={<GetPaidPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
