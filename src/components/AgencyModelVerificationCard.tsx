import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, limit, query } from 'firebase/firestore';
import { Link } from 'react-router';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useTranslation } from 'react-i18next';
import { Search, ShieldCheck, UserCheck, Building2, ExternalLink, AtSign, Check, X, Sparkles, Filter, ChevronRight } from 'lucide-react';
import ModelVerifiedBadge from './ModelVerifiedBadge';
import { User } from '../types';
import { DEFAULT_AGENCIES } from '../data/defaultAgencies';

interface AgencyModelVerificationCardProps {
  currentAgencyName?: string;
  currentAgencyId?: string;
  isSuperAdmin?: boolean;
  onModelVerified?: () => void;
}

export default function AgencyModelVerificationCard({
  currentAgencyName,
  currentAgencyId,
  isSuperAdmin = false,
  onModelVerified
}: AgencyModelVerificationCardProps) {
  const { currentUser, dbUser } = useAuth();
  const ui = useUI();
  const { t } = useTranslation();

  const [availableAgencies, setAvailableAgencies] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  const [searchHandle, setSearchHandle] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [allModels, setAllModels] = useState<User[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch all agencies list from db + defaults
  useEffect(() => {
    const fetchAgenciesList = async () => {
      const OBSOLETE = ['fms models', 'fashion model school', 'high life model agency', 'high life', 'baku model management', 'baku models'];
      try {
        const snap = await getDocs(collection(db, 'agencies'));
        const dbAgencyNames = snap.docs
          .map(d => (d.data().name || '').trim())
          .map(n => n.toLowerCase() === 'nl models' ? 'LN Models' : n)
          .filter(n => Boolean(n) && !OBSOLETE.some(obs => n.toLowerCase().includes(obs)));

        const defaultNames = DEFAULT_AGENCIES.map(a => a.name);
        const unique = Array.from(new Set([...dbAgencyNames, ...defaultNames]));
        setAvailableAgencies(unique);
      } catch (err) {
        console.warn('Could not load agencies list:', err);
        setAvailableAgencies(DEFAULT_AGENCIES.map(a => a.name));
      }
    };
    fetchAgenciesList();
  }, []);

  const effectiveAgency = useMemo(() => {
    if (selectedAgency !== 'all') return selectedAgency;
    return currentAgencyName || dbUser?.representedAgencyName || dbUser?.modelAgencyName || availableAgencies[0] || 'Venera Models';
  }, [selectedAgency, currentAgencyName, dbUser, availableAgencies]);

  const fetchAgencyModels = async () => {
    setLoadingList(true);
    try {
      const usersRef = collection(db, 'users');
      const allUsersSnap = await getDocs(usersRef);
      const list: User[] = [];
      allUsersSnap.docs.forEach(docSnap => {
        const u = { id: docSnap.id, ...docSnap.data() } as User;
        if (u.hasModelBadge || u.isModel || u.modelAgencyName || u.modelVerificationStatus === 'pending') {
          list.push(u);
        }
      });
      setAllModels(list);
    } catch (err) {
      console.error('Error fetching agency models:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAgencyModels();
  }, []);

  // Compute verified counts per agency
  const agencyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allModels.forEach(m => {
      if (m.hasModelBadge) {
        const agency = m.modelAgencyName || m.modelVerifiedByAgency || 'Независимая модель';
        counts[agency] = (counts[agency] || 0) + 1;
      }
    });
    return counts;
  }, [allModels]);

  // Filter verified models
  const verifiedModels = useMemo(() => {
    return allModels.filter(u => {
      if (!u.hasModelBadge) return false;
      if (selectedAgency === 'all') return true;
      const agency = (u.modelAgencyName || u.modelVerifiedByAgency || '').toLowerCase();
      return agency === selectedAgency.toLowerCase();
    });
  }, [allModels, selectedAgency]);

  // Filter pending models
  const pendingModels = useMemo(() => {
    return allModels.filter(u => {
      if (u.hasModelBadge) return false;
      if (selectedAgency === 'all') return true;
      const agency = (u.modelAgencyName || u.modelVerifiedByAgency || '').toLowerCase();
      return agency === selectedAgency.toLowerCase();
    });
  }, [allModels, selectedAgency]);

  // Live handle / user search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryTerm = searchHandle.trim().replace(/^@/, '').toLowerCase();
    if (!queryTerm) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(150)));
      const matches: User[] = [];

      snap.docs.forEach(d => {
        const u = { id: d.id, ...(d.data() as any) } as User;
        const uName = (u.name || '').toLowerCase();
        const uUsername = (u.username || '').toLowerCase();
        const uHandle = (u.handle || '').toLowerCase().replace(/^@/, '');
        const uEmail = (u.email || '').toLowerCase();

        if (
          d.id.toLowerCase().includes(queryTerm) ||
          uUsername.includes(queryTerm) ||
          uHandle.includes(queryTerm) ||
          uName.includes(queryTerm) ||
          uEmail.includes(queryTerm)
        ) {
          matches.push(u);
        }
      });

      setSearchResults(matches);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Verify Model
  const handleVerifyModel = async (targetUser: User, targetAgency?: string) => {
    if (!currentUser) return;
    setActionInProgress(targetUser.id);
    const agencyToRecord = targetAgency || (selectedAgency !== 'all' ? selectedAgency : effectiveAgency);

    try {
      const targetRef = doc(db, 'users', targetUser.id);
      await updateDoc(targetRef, {
        isModel: true,
        hasModelBadge: true,
        modelVerificationStatus: 'verified',
        modelAgencyName: agencyToRecord,
        modelVerifiedByAgency: agencyToRecord,
        modelVerifiedByUserId: currentUser.uid,
        modelVerifiedAt: Date.now()
      });

      // Send in-app notification to the model
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.id,
          type: 'model_verified',
          fromUserId: currentUser.uid,
          fromUserName: dbUser?.name || 'Agency Representative',
          fromUserAvatar: dbUser?.avatarUrl || '',
          title: 'Статус модели подтвержден! 😎',
          message: `Модельное агентство «${agencyToRecord}» подтвердило ваш статус модели. Возле вашего имени теперь отображается значок модели 😎.`,
          link: `/@${targetUser.username || targetUser.id}`,
          read: false,
          createdAt: Date.now(),
          metadata: {
            agencyName: agencyToRecord,
            badge: '😎'
          }
        });
      } catch (notifErr) {
        console.warn('Could not dispatch notification:', notifErr);
      }

      ui.alert(`Модель @${targetUser.username || targetUser.name} успешно подтверждена для агентства «${agencyToRecord}»! Значок 😎 присвоен.`);
      
      await fetchAgencyModels();
      setSearchResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, hasModelBadge: true, modelVerificationStatus: 'verified', modelAgencyName: agencyToRecord } : u));
      onModelVerified?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setActionInProgress(null);
    }
  };

  // Revoke Model Badge
  const handleRevokeModel = async (targetUser: User) => {
    if (!currentUser) return;
    const ok = await ui.confirm(`Отозвать подтвержденный статус модели у @${targetUser.username || targetUser.name}?`);
    if (!ok) return;

    setActionInProgress(targetUser.id);
    try {
      const targetRef = doc(db, 'users', targetUser.id);
      await updateDoc(targetRef, {
        hasModelBadge: false,
        modelVerificationStatus: 'rejected',
        modelVerifiedAt: null
      });

      ui.alert(`Подтверждение модели у @${targetUser.username || targetUser.name} отозвано.`);
      await fetchAgencyModels();
      setSearchResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, hasModelBadge: false, modelVerificationStatus: 'rejected' } : u));
      onModelVerified?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="rounded-3xl border border-brand-dark/[0.08] bg-white p-6 sm:p-10 shadow-xs space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-brand-dark/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-accent px-2.5 py-0.5 rounded-full bg-brand-accent/5 border border-brand-accent/15">
              Agency Management & Rosters
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-brand-dark flex items-center gap-2.5">
            <span>Верификация моделей по агентствам</span>
            <ModelVerifiedBadge size="md" />
          </h2>
          <p className="text-xs sm:text-sm text-brand-dark/60 mt-1 font-normal">
            Выберите агентство из списка ниже, чтобы просмотреть всех подтвержденных моделей данного агентства или верифицировать новых.
          </p>
        </div>
      </div>

      {/* Agency Switcher List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark/70 flex items-center gap-1.5">
            <Building2 size={14} className="text-brand-accent" />
            Выберите агентство для просмотра моделей:
          </label>
          <span className="text-xs font-mono text-brand-dark/50">
            Всего агентств: {availableAgencies.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedAgency('all')}
            className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
              selectedAgency === 'all'
                ? 'bg-brand-dark text-white font-semibold'
                : 'bg-brand-muted/30 text-brand-dark/80 hover:bg-brand-muted/60 border border-brand-dark/[0.08]'
            }`}
          >
            <span>Все агентства</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              selectedAgency === 'all' ? 'bg-brand-accent text-white' : 'bg-brand-dark/10 text-brand-dark'
            }`}>
              {allModels.filter(m => m.hasModelBadge).length}
            </span>
          </button>

          {availableAgencies.map(agencyName => {
            const count = agencyCounts[agencyName] || 0;
            const isSelected = selectedAgency.toLowerCase() === agencyName.toLowerCase();
            return (
              <button
                key={agencyName}
                type="button"
                onClick={() => setSelectedAgency(agencyName)}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-brand-dark text-white font-semibold'
                    : 'bg-white hover:bg-brand-muted/40 text-brand-dark border border-brand-dark/[0.12]'
                }`}
              >
                <span>{agencyName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-brand-accent text-white' : 'bg-brand-muted text-brand-dark/70 border border-brand-dark/[0.08]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Agency Focus Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-brand-muted/20 border border-brand-dark/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center font-serif font-bold text-sm">
            {selectedAgency === 'all' ? 'ALL' : selectedAgency[0]}
          </div>
          <div>
            <h3 className="font-serif font-normal text-lg sm:text-xl text-brand-dark leading-tight">
              {selectedAgency === 'all' ? 'Все подтвержденные модели платформы' : `Агентство: ${selectedAgency}`}
            </h3>
            <p className="text-xs font-mono text-brand-dark/50 mt-0.5">
              {selectedAgency === 'all'
                ? `Отображаются модели всех ${availableAgencies.length} агентств`
                : `Официальный список подтвержденных моделей («${selectedAgency}»)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-brand-dark px-3 py-1.5 rounded-full bg-white border border-brand-dark/[0.1] shadow-2xs">
            Подтверждено: <strong className="text-brand-accent">{verifiedModels.length}</strong>
          </span>
          <button
            type="button"
            onClick={fetchAgencyModels}
            className="px-3 py-1.5 rounded-full bg-white border border-brand-dark/[0.1] hover:bg-brand-muted text-xs font-mono uppercase tracking-wider text-brand-dark cursor-pointer shadow-2xs"
          >
            Обновить
          </button>
        </div>
      </div>

      {/* Search and verify new model */}
      <section className="rounded-2xl border border-brand-dark/[0.08] bg-brand-muted/30 p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-brand-dark flex items-center gap-1.5">
            <AtSign size={15} className="text-brand-accent" />
            Поиск и верификация модели по @username
          </label>
          <span className="text-[11px] font-mono text-brand-dark/50">
            {selectedAgency !== 'all' ? `Будет привязана к «${selectedAgency}»` : 'Укажите никнейм модели'}
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-dark/40 font-mono font-bold text-sm">
              @
            </div>
            <input
              type="text"
              value={searchHandle}
              onChange={e => {
                setSearchHandle(e.target.value);
                if (!e.target.value.trim()) {
                  setSearchResults([]);
                  setHasSearched(false);
                }
              }}
              placeholder="Введите никнейм пользователя..."
              className="w-full bg-white border border-brand-dark/[0.12] rounded-xl pl-8 pr-4 py-2.5 text-xs sm:text-sm font-mono text-brand-dark focus:outline-none focus:border-brand-accent shadow-2xs placeholder:font-sans placeholder:text-brand-dark/40"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-brand-dark text-white px-6 sm:px-8 py-2.5 font-semibold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Search size={14} />
            <span>{searching ? 'Поиск...' : 'Найти'}</span>
          </button>
        </form>

        {/* Search Results */}
        {hasSearched && (
          <div className="pt-2 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-dark/70">
              Результаты поиска ({searchResults.length}):
            </h4>
            {searchResults.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-dashed border-brand-dark/20 text-center text-xs sm:text-sm text-brand-dark/60 font-mono">
                Пользователь «{searchHandle}» не найден. Убедитесь, что модель зарегистрирована в системе.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="p-4 bg-white rounded-2xl border border-brand-dark/[0.08] flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center">
                        {user.avatarUrl || (user as any).photoURL ? (
                          <img src={user.avatarUrl || (user as any).photoURL} alt={user.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <span className="font-serif font-bold text-brand-dark uppercase">{(user.name || 'U')[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-brand-dark text-sm truncate">{user.name}</span>
                          {user.hasModelBadge && <ModelVerifiedBadge size="xs" />}
                        </div>
                        <p className="font-mono text-xs text-brand-accent font-medium">
                          {user.handle || `@${user.username || user.id.substring(0, 8)}`}
                        </p>
                        {user.modelAgencyName && (
                          <p className="font-mono text-[10px] text-brand-dark/60 mt-0.5 truncate">
                            Агентство: <strong>{user.modelAgencyName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-brand-dark/[0.06] flex items-center justify-between">
                      <Link
                        to={`/@${user.handle?.replace(/^@+/, '') || user.username || user.id}`}
                        target="_blank"
                        className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark hover:text-brand-accent flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> Профиль
                      </Link>

                      {user.hasModelBadge ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeModel(user)}
                          className="px-3 py-1 rounded-full border border-red-200 text-red-700 bg-red-50 text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-red-100 transition-colors cursor-pointer shadow-2xs"
                        >
                          Отозвать
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerifyModel(user, selectedAgency !== 'all' ? selectedAgency : undefined)}
                          disabled={actionInProgress === user.id}
                          className="px-3.5 py-1.5 rounded-full bg-brand-dark hover:bg-brand-accent text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <UserCheck size={12} />
                          <span>Подтвердить в {selectedAgency !== 'all' ? selectedAgency : 'Агентство'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Verified Models Roster for selected agency */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-dark/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-serif font-normal tracking-tight text-brand-dark">
              {selectedAgency === 'all'
                ? 'Все подтвержденные модели'
                : `Подтвержденные модели агентства «${selectedAgency}»`}
            </h3>
            <span className="bg-brand-dark text-white px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full">
              {verifiedModels.length}
            </span>
          </div>
        </div>

        {loadingList ? (
          <p className="text-xs font-mono uppercase tracking-wider text-brand-dark/60 py-4">Загрузка моделей...</p>
        ) : verifiedModels.length === 0 ? (
          <div className="p-8 bg-brand-muted/20 rounded-2xl border border-dashed border-brand-dark/15 text-center space-y-1">
            <p className="text-sm font-semibold text-brand-dark">
              {selectedAgency === 'all'
                ? 'В системе пока нет подтвержденных моделей.'
                : `Для агентства «${selectedAgency}» пока нет подтвержденных моделей.`}
            </p>
            <p className="text-xs text-brand-dark/60 max-w-md mx-auto leading-relaxed font-mono">
              Используйте поле поиска по @username выше, чтобы верифицировать моделей и привязать их к агентству «{selectedAgency}».
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {verifiedModels.map(user => (
              <div
                key={user.id}
                className="p-4 bg-white rounded-2xl border border-brand-dark/[0.08] flex items-center justify-between gap-3 shadow-2xs hover:border-brand-accent/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center">
                    {user.avatarUrl || (user as any).photoURL ? (
                      <img src={user.avatarUrl || (user as any).photoURL} alt={user.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <span className="font-serif font-bold text-brand-dark uppercase">{(user.name || 'U')[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-brand-dark text-xs truncate">{user.name}</span>
                      <ModelVerifiedBadge size="xs" />
                    </div>
                    <Link
                      to={`/@${user.handle?.replace(/^@+/, '') || user.username || user.id}`}
                      target="_blank"
                      className="font-mono text-[11px] text-brand-accent hover:underline truncate block"
                    >
                      {user.handle || `@${user.username || user.id.substring(0, 8)}`}
                    </Link>
                    <div className="text-[10px] font-mono text-brand-dark/60 mt-0.5 truncate">
                      {user.modelAgencyName || user.modelVerifiedByAgency || 'Официальная модель'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRevokeModel(user)}
                    title="Отозвать статус модели"
                    className="w-7 h-7 rounded-full border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending models if any */}
      {pendingModels.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-brand-dark/[0.08]">
          <div className="flex items-center justify-between border-b border-brand-dark/[0.08] pb-3">
            <h3 className="text-lg sm:text-xl font-serif font-normal tracking-tight text-brand-dark flex items-center gap-2">
              <span>Ожидают подтверждения</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-xs font-mono font-semibold rounded-full">
                {pendingModels.length}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pendingModels.map(user => (
              <div
                key={user.id}
                className="p-4 bg-white rounded-2xl border border-brand-dark/[0.08] flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-brand-dark/10 overflow-hidden bg-brand-muted shrink-0 flex items-center justify-center">
                    {user.avatarUrl || (user as any).photoURL ? (
                      <img src={user.avatarUrl || (user as any).photoURL} alt={user.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <span className="font-serif font-bold text-brand-dark uppercase">{(user.name || 'U')[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-brand-dark text-xs truncate block">{user.name}</span>
                    <span className="font-mono text-[11px] text-brand-accent truncate block">{user.handle || `@${user.username || user.id}`}</span>
                    <span className="text-[10px] font-mono text-brand-dark/60 block truncate">Агентство: {user.modelAgencyName || 'Не указано'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyModel(user, user.modelAgencyName || (selectedAgency !== 'all' ? selectedAgency : undefined))}
                  disabled={actionInProgress === user.id}
                  className="px-3 py-1.5 rounded-full bg-brand-dark hover:bg-brand-accent text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  Одобрить
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
