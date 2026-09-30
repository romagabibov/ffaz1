import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { SiteFeaturesProvider } from './context/SiteFeaturesContext';
import FeatureRouteGuard from './components/FeatureRouteGuard';
import './i18n';
import Layout from './components/Layout';

// High-priority immediate routes
import Home from './pages/Home';

// Lazy loaded on-demand page bundles to eliminate load lag and speed up startup
const EventsList = lazy(() => import('./pages/EventsList'));
const Designers = lazy(() => import('./pages/Designers'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Legal = lazy(() => import('./pages/Legal'));
const About = lazy(() => import('./pages/About'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Education = lazy(() => import('./pages/Education'));
const Agencies = lazy(() => import('./pages/Agencies'));
const Careers = lazy(() => import('./pages/Careers'));
const Feed = lazy(() => import('./pages/Feed'));
const News = lazy(() => import('./pages/News'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
import UserProfilePublic from './pages/UserProfilePublic';
const More = lazy(() => import('./pages/More'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-brand-dark/20 border-t-brand-accent rounded-full animate-spin mb-4" />
      <span className="text-xs uppercase tracking-widest font-mono font-bold text-brand-dark/60">
        Loading...
      </span>
    </div>
  );
}

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <SiteFeaturesProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<FeatureRouteGuard featureId="page_home" featureTitle="Главная страница"><Home /></FeatureRouteGuard>} />
                <Route path="events" element={<FeatureRouteGuard featureId="page_events" featureTitle="Показы и Календарь"><Suspense fallback={<PageLoader />}><EventsList /></Suspense></FeatureRouteGuard>} />
                <Route path="designers" element={<FeatureRouteGuard featureId="page_designers" featureTitle="Каталог дизайнеров"><Suspense fallback={<PageLoader />}><Designers /></Suspense></FeatureRouteGuard>} />
                <Route path="education" element={<FeatureRouteGuard featureId="page_education" featureTitle="Образование и Академии"><Suspense fallback={<PageLoader />}><Education /></Suspense></FeatureRouteGuard>} />
                <Route path="agencies" element={<FeatureRouteGuard featureId="page_agencies" featureTitle="Модельные агентства"><Suspense fallback={<PageLoader />}><Agencies /></Suspense></FeatureRouteGuard>} />
                <Route path="news" element={<FeatureRouteGuard featureId="page_news" featureTitle="Новости моды"><Suspense fallback={<PageLoader />}><News /></Suspense></FeatureRouteGuard>} />
                <Route path="news/:id" element={<FeatureRouteGuard featureId="page_news" featureTitle="Новости моды"><Suspense fallback={<PageLoader />}><News /></Suspense></FeatureRouteGuard>} />
                <Route path="opportunities" element={<FeatureRouteGuard featureId="page_opportunities" featureTitle="Кастинги и Вакансии"><Suspense fallback={<PageLoader />}><Careers /></Suspense></FeatureRouteGuard>} />
                <Route path="vacancies" element={<FeatureRouteGuard featureId="page_opportunities" featureTitle="Кастинги и Вакансии"><Suspense fallback={<PageLoader />}><Careers /></Suspense></FeatureRouteGuard>} />
                <Route path="internships" element={<FeatureRouteGuard featureId="page_opportunities" featureTitle="Кастинги и Вакансии"><Suspense fallback={<PageLoader />}><Careers /></Suspense></FeatureRouteGuard>} />
                <Route path="volunteers" element={<FeatureRouteGuard featureId="page_opportunities" featureTitle="Кастинги и Вакансии"><Suspense fallback={<PageLoader />}><Careers /></Suspense></FeatureRouteGuard>} />
                <Route path="feed" element={<FeatureRouteGuard featureId="page_feed" featureTitle="Модная Лента"><Suspense fallback={<PageLoader />}><Feed /></Suspense></FeatureRouteGuard>} />
                <Route path="messages" element={<FeatureRouteGuard featureId="page_messages" featureTitle="Личные сообщения"><Suspense fallback={<PageLoader />}><Messages /></Suspense></FeatureRouteGuard>} />
                <Route path="chat" element={<FeatureRouteGuard featureId="page_messages" featureTitle="Личные сообщения"><Suspense fallback={<PageLoader />}><Messages /></Suspense></FeatureRouteGuard>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
                <Route path="plans" element={<FeatureRouteGuard featureId="page_subscriptions" featureTitle="Тарифные планы"><Suspense fallback={<PageLoader />}><SubscriptionPlans /></Suspense></FeatureRouteGuard>} />
                <Route path="subscription-plans" element={<FeatureRouteGuard featureId="page_subscriptions" featureTitle="Тарифные планы"><Suspense fallback={<PageLoader />}><SubscriptionPlans /></Suspense></FeatureRouteGuard>} />
                <Route path="subscriptions" element={<FeatureRouteGuard featureId="page_subscriptions" featureTitle="Тарифные планы"><Suspense fallback={<PageLoader />}><SubscriptionPlans /></Suspense></FeatureRouteGuard>} />
                <Route path="more" element={<Suspense fallback={<PageLoader />}><More /></Suspense>} />
                <Route path="sections" element={<Suspense fallback={<PageLoader />}><More /></Suspense>} />
                <Route path="login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
                <Route path="onboarding" element={<Suspense fallback={<PageLoader />}><Onboarding /></Suspense>} />
                <Route path="privacy" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
                <Route path="terms" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
                <Route path="cookies" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
                <Route path="about" element={<FeatureRouteGuard featureId="page_about" featureTitle="О нас и Центр моды"><Suspense fallback={<PageLoader />}><About /></Suspense></FeatureRouteGuard>} />
                <Route path="event/:id" element={<Suspense fallback={<PageLoader />}><EventDetails /></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
                <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
                <Route path="u/:username" element={<UserProfilePublic />} />
                <Route path="@:username" element={<UserProfilePublic />} />
                <Route path=":handle" element={<UserProfilePublic />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SiteFeaturesProvider>
      </AuthProvider>
    </UIProvider>
  );
}
