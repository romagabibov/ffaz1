import React, { useState } from 'react';
import { 
 signInWithPopup, 
 GoogleAuthProvider, 
 createUserWithEmailAndPassword, 
 signInWithEmailAndPassword,
 sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles } from 'lucide-react';

export default function Login() {
 const { t, i18n } = useTranslation();
 const navigate = useNavigate();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [isRegister, setIsRegister] = useState(false);
 const [error, setError] = useState('');
 const [errorCode, setErrorCode] = useState('');
 const [isGoogleLoading, setIsGoogleLoading] = useState(false);
 const [showConfigNotice, setShowConfigNotice] = useState(false);
 const [resetSentMessage, setResetSentMessage] = useState('');
 const [isResettingPassword, setIsResettingPassword] = useState(false);

 const getReadableAuthError = (err: any): { code: string; message: string } => {
 const code = err?.code || '';
 const rawMsg = err?.message || '';
 const lang = (i18n.language || 'ru').toLowerCase();

 if (code === 'auth/email-already-in-use' || rawMsg.includes('auth/email-already-in-use')) {
 if (lang.startsWith('az')) {
 return {
 code: 'auth/email-already-in-use',
 message: 'Bu e-poçt ünvanı artıq qeydiyyatdan keçib. Zəhmət olmasa daxil olun.'
 };
 }
 if (lang.startsWith('en')) {
 return {
 code: 'auth/email-already-in-use',
 message: 'An account with this email address already exists. Please sign in instead.'
 };
 }
 return {
 code: 'auth/email-already-in-use',
 message: 'Этот адрес электронной почты уже зарегистрирован в системе. Пожалуйста, войдите в свой аккаунт.'
 };
 }

 if (code === 'auth/invalid-credential' || rawMsg.includes('auth/invalid-credential') || code === 'auth/wrong-password' || rawMsg.includes('auth/wrong-password')) {
 if (lang.startsWith('az')) return { code: 'auth/invalid-credential', message: 'E-poçt və ya şifrə yanlışdır.' };
 if (lang.startsWith('en')) return { code: 'auth/invalid-credential', message: 'Invalid email address or password.' };
 return { code: 'auth/invalid-credential', message: 'Неверный адрес электронной почты или пароль.' };
 }

 if (code === 'auth/user-not-found' || rawMsg.includes('auth/user-not-found')) {
 if (lang.startsWith('az')) return { code: 'auth/user-not-found', message: 'Bu e-poçt ilə istifadəçi tapılmadı. Qeydiyyatdan keçin.' };
 if (lang.startsWith('en')) return { code: 'auth/user-not-found', message: 'No account found with this email. Please register.' };
 return { code: 'auth/user-not-found', message: 'Аккаунт с таким email не найден. Пожалуйста, пройдите регистрацию.' };
 }

 if (code === 'auth/weak-password' || rawMsg.includes('auth/weak-password')) {
 if (lang.startsWith('az')) return { code: 'auth/weak-password', message: 'Şifrə çox sadədir (ən az 6 simvol tələb olunur).' };
 if (lang.startsWith('en')) return { code: 'auth/weak-password', message: 'Password is too weak (minimum 6 characters required).' };
 return { code: 'auth/weak-password', message: 'Пароль слишком простой (минимум 6 символов).' };
 }

 if (code === 'auth/invalid-email' || rawMsg.includes('auth/invalid-email')) {
 if (lang.startsWith('az')) return { code: 'auth/invalid-email', message: 'Düzgün e-poçt formatı daxil edin.' };
 if (lang.startsWith('en')) return { code: 'auth/invalid-email', message: 'Please enter a valid email address.' };
 return { code: 'auth/invalid-email', message: 'Пожалуйста, введите корректный адрес электронной почты.' };
 }

 if (code === 'auth/too-many-requests' || rawMsg.includes('auth/too-many-requests')) {
 if (lang.startsWith('az')) return { code: 'auth/too-many-requests', message: 'Çox sayda uğursuz cəhd. Zəhmət olmasa bir az sonra yenidən cəhd edin.' };
 if (lang.startsWith('en')) return { code: 'auth/too-many-requests', message: 'Too many attempts. Please try again later.' };
 return { code: 'auth/too-many-requests', message: 'Слишком много неудачных попыток входа. Доступ временно ограничен в целях безопасности. Попробуйте позже.' };
 }

 if (code === 'auth/network-request-failed' || rawMsg.includes('auth/network-request-failed')) {
 if (lang.startsWith('az')) return { code: 'auth/network-request-failed', message: 'Şəbəkə xətası. İnternet bağlantınızı yoxlayın.' };
 if (lang.startsWith('en')) return { code: 'auth/network-request-failed', message: 'Network connection error. Please check your internet.' };
 return { code: 'auth/network-request-failed', message: 'Ошибка сети. Проверьте подключение к интернету.' };
 }

 return { code: code || 'auth/unknown', message: rawMsg || 'Authentication error. Please try again.' };
 };

 const checkAndCreateUser = async (user: any, providedName?: string, isNewRegistration?: boolean) => {
 try {
 const now = Date.now();
 const userRef = doc(db, 'users', user.uid);
 const userDoc = await getDoc(userRef);

 if (!userDoc.exists()) {
 if (user.email) {
 const q = query(collection(db, 'users'), where('email', '==', user.email));
 const qs = await getDocs(q);
 if (!qs.empty) {
 await auth.signOut();
 setErrorCode('auth/email-already-in-use');
 setError(t('error_email_in_use') || 'An account already exists with this email.');
 return;
 }
 }
 let assignedRole = 'user';
 try {
 if (user.email) {
 const inviteDoc = await getDoc(doc(db, 'admin_invites', user.email.toLowerCase()));
 if (inviteDoc.exists() && inviteDoc.data()?.role) {
 assignedRole = inviteDoc.data().role;
 }
 }
 } catch (e) {
 console.error('Error checking admin invite:', e);
 }

 await setDoc(userRef, {
 email: user.email || '',
 name: providedName || user.displayName || 'Fashionista',
 role: assignedRole,
 createdAt: now,
 lastLoginAt: now,
 lastActiveAt: now,
 onboardingComplete: false
 });
 navigate('/onboarding');
 } else {
 const data = userDoc.data();
 // Update last login and activity timestamp
 try {
 await updateDoc(userRef, {
 lastLoginAt: now,
 lastActiveAt: now,
 });
 } catch (e) {
 console.warn('Could not update lastLogin timestamp:', e);
 }

 if (!data.onboardingComplete) {
 navigate('/onboarding');
 } else {
 navigate('/');
 }
 }
 } catch (err) {
 handleFirestoreError(err, OperationType.CREATE, 'users');
 }
 };

 const handleGoogleLogin = async () => {
 if (isGoogleLoading) return;
 setIsGoogleLoading(true);
 setError('');
 setErrorCode('');
 setResetSentMessage('');

 try {
 const provider = new GoogleAuthProvider();
 provider.setCustomParameters({ prompt: 'select_account' });
 const result = await signInWithPopup(auth, provider);
 await checkAndCreateUser(result.user);
 } catch (err: any) {
 const parsed = getReadableAuthError(err);
 
 if (parsed.code === 'auth/popup-closed-by-user' || parsed.code === 'auth/cancelled-popup-request') {
 return;
 }

 console.error('Google Sign-in error:', err);
 setErrorCode(parsed.code);

 if (parsed.code === 'auth/popup-blocked') {
 setError('Login popup was blocked by your browser or security settings. Please allow popups for this site.');
 } else if (parsed.code === 'auth/account-exists-with-different-credential') {
 setError(t('error_email_in_use') || 'An account already exists with this email address using a different sign-in method.');
 } else {
 setError(parsed.message);
 }
 } finally {
 setIsGoogleLoading(false);
 }
 };

 const handleEmailAuth = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setErrorCode('');
 setResetSentMessage('');

 try {
 if (isRegister) {
          const cleanEmail = email.trim().toLowerCase();
          const cleanPassword = password;
          const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
 await checkAndCreateUser(result.user, name, true);
 } else {
          const cleanEmail = email.trim().toLowerCase();
          const cleanPassword = password;
          const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
 await checkAndCreateUser(result.user);
 }
 } catch (err: any) {
 if (err?.message?.includes('auth/operation-not-allowed')) {
 setShowConfigNotice(true);
 } else {
 const parsed = getReadableAuthError(err);
 setErrorCode(parsed.code);
 setError(parsed.message);
 }
 }
 };

 const handleSwitchToLoginFromError = () => {
 setIsRegister(false);
 setError('');
 setErrorCode('');
 setResetSentMessage('');
 };

 const handleForgotPassword = async () => {
 if (!email) {
 setError(
 i18n.language?.startsWith('az')
 ? 'Zəhmət olmasa şifrəni bərpa etmək üçün əvvəlcə e-poçt ünvanınızı daxil edin.'
 : i18n.language?.startsWith('en')
 ? 'Please enter your email address first to reset your password.'
 : 'Пожалуйста, сначала введите ваш адрес электронной почты в поле Email.'
 );
 return;
 }

 setIsResettingPassword(true);
 setError('');
 setErrorCode('');

 try {
 await sendPasswordResetEmail(auth, email.trim());
 setResetSentMessage(
 i18n.language?.startsWith('az')
 ? `Şifrə sıfırlama təlimatları ${email} ünvanına göndərildi.`
 : i18n.language?.startsWith('en')
 ? `Password reset link has been sent to ${email}.`
 : `Ссылка для восстановления пароля успешно отправлена на ${email}. Проверьте входящие и папку «Спам».`
 );
 } catch (err: any) {
 const parsed = getReadableAuthError(err);
 setError(parsed.message);
 } finally {
 setIsResettingPassword(false);
 }
 };

  return (
    <div className="flex justify-center items-center h-full min-h-[calc(100vh-80px)] animate-in fade-in duration-700 bg-brand-light p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-dark/[0.08] p-7 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Editorial Top Accent */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
            Baku Fashion Week Pass
          </span>
          <span className="text-[10px] font-mono text-brand-dark/40 uppercase tracking-widest">
            AZ/FSHN ID
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight mb-2 text-brand-dark">
          {isRegister ? (t('register', 'Регистрация') || 'Регистрация') : (t('login_email', 'Вход в аккаунт') || 'Вход')}
        </h1>
        <p className="text-xs font-mono text-brand-dark/60 mb-6">
          {isRegister 
            ? 'Создайте профиль дизайнера, модели, скаута или гостя BFW' 
            : 'Введите учетные данные для доступа к сервисам платформы'}
        </p>
        
        {showConfigNotice && (
          <div className="p-4 mb-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono">
            Please enable Email/Password Authentication in your Firebase Console &rarr; Authentication &rarr; Sign-in method.
          </div>
        )}

        {resetSentMessage && (
          <div className="p-4 mb-6 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-medium flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <span>{resetSentMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-red-50 text-red-950 border border-red-200 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="leading-snug">{error}</p>
                {errorCode === 'auth/email-already-in-use' && isRegister && (
                  <div className="mt-3 pt-3 border-t border-red-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-red-800 normal-case font-semibold">
                      Этот аккаунт уже создан. Вы можете войти:
                    </span>
                    <button
                      type="button"
                      onClick={handleSwitchToLoginFromError}
                      className="px-3 py-1 bg-brand-dark text-white rounded-full font-semibold text-xs uppercase tracking-wider hover:bg-brand-accent transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Войти</span> <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {!isRegister && (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found') && (
                  <div className="mt-3 pt-3 border-t border-red-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-red-800 normal-case font-semibold">
                      Ещё нет аккаунта? Зарегистрируйтесь с этим email:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(true);
                        setError('');
                        setErrorCode('');
                      }}
                      className="px-3 py-1 bg-[#7a0000] text-white rounded-full font-semibold text-xs uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Регистрация</span> <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-6 relative z-10">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block">{t('name', 'Name')}</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="Əli Əliyev Əli"
                className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 text-sm font-medium text-brand-dark focus:bg-white focus:outline-none focus:border-brand-accent transition-all"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block">{t('email', 'Email')}</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="fashion@example.com"
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 text-sm font-medium text-brand-dark focus:bg-white focus:outline-none focus:border-brand-accent transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-brand-dark/70 font-semibold block">{t('password', 'Password')}</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                  className="text-[11px] font-mono font-medium text-brand-accent hover:underline transition-colors cursor-pointer"
                >
                  {isResettingPassword ? 'Отправка...' : 'Забыли пароль?'}
                </button>
              )}
            </div>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-muted/30 border border-brand-dark/[0.12] rounded-xl px-4 py-3 text-sm font-medium text-brand-dark focus:bg-white focus:outline-none focus:border-brand-accent transition-all"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-brand-dark hover:bg-brand-accent text-white font-semibold uppercase tracking-wider text-xs py-3.5 rounded-full transition-colors shadow-2xs cursor-pointer mt-2"
          >
            {isRegister ? 'Зарегистрироваться' : 'Войти в систему'}
          </button>
        </form>
        
        <div className="text-center text-xs mb-6 text-brand-dark/70 font-medium border-t border-brand-dark/[0.08] pt-6">
          <span className="font-mono">{isRegister ? 'Уже есть аккаунт?' : 'Впервые на платформе?'}</span>
          <button 
            type="button" 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setErrorCode('');
              setResetSentMessage('');
            }} 
            className="ml-2 font-semibold text-brand-accent hover:underline uppercase tracking-wider cursor-pointer"
          >
            {isRegister ? 'Войти' : 'Регистрация'}
          </button>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          disabled={isGoogleLoading}
          className={`w-full bg-white hover:bg-brand-muted/40 border border-brand-dark/[0.12] py-3 rounded-full uppercase text-xs font-semibold tracking-wider flex items-center justify-center gap-3 text-brand-dark transition-all cursor-pointer shadow-2xs ${isGoogleLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {isGoogleLoading ? 'Connecting to Google...' : 'Войти через Google'}
        </button>
      </div>
    </div>
  );
}
