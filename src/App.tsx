import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient, type User } from '@supabase/supabase-js';
import {
  Activity, ArrowUpRight, CheckCircle2, CircleHelp, Clock3, Code2, Download, Eye, Monitor, Smartphone,
  ExternalLink, FileText, Github, Globe2, History, LayoutDashboard, LogIn,
  LogOut, Plus, Rocket, Save, ShieldCheck, Sparkles, Terminal, GitBranch, RefreshCw,
  WandSparkles, XCircle, FileCode2, FolderInput, Search, FilePlus2
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://upajzbaeuwzbhxfebzvi.supabase.co';
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || 'sb_publishable_tvp9Kreo5aMpK-aEU3AteA_axQbYhDP';
const supabase = createClient(supabaseUrl, supabaseKey);

type Tab = 'overview' | 'sites' | 'content' | 'developer' | 'android' | 'history' | 'devops' | 'admin';
type Profile = { role: string; display_name: string | null };
type Build = {
  id: string; status: string; requested_at: string; apk_url: string | null;
  aab_url: string | null; source_zip_url: string | null; error_message: string | null;
  projects?: { name: string; website_url: string; package_name: string } | null
};
type ManagedSite = { id: string; name: string; site_url: string | null; description: string; framework: string; project_path: string | null; status: 'draft'|'published'|'archived'; updated_at: string };
type SitePage = { id: string; site_id: string; title: string; slug: string; body: string; status: 'draft'|'published'; updated_at: string };
type WorkflowRun = { id: number; name: string; status: string; conclusion: string | null; html_url: string; head_branch: string; head_sha: string; created_at: string; display_title: string };
const statusText: Record<string,string> = { pending: 'Queued', building: 'Building', completed: 'Ready', failed: 'Failed' };
const emptyPage = { title: 'New page', slug: 'new-page', body: '', status: 'draft' as const };
function validUrl(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-page'; }
function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;'); }
function encodeBase64(value: string) { const bytes = new TextEncoder().encode(value); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function decodeBase64(value: string) { const binary = atob(value.replace(/\\s/g, '')); const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0)); return new TextDecoder().decode(bytes); }
function safeRepoPath(value: string) { return value.split('/').filter(Boolean).map(part => part.replace(/[^a-zA-Z0-9._-]/g, '-')).filter(part => part !== '.' && part !== '..').join('/'); }
async function writeGitHubFile(token: string, path: string, content: string, message: string) {
  const response = await fetch(`https://api.github.com/repos/gpldroid/mega/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ message, content: encodeBase64(content), branch: 'main' })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'GitHub refused repository write access. Sign in with GitHub again and approve public repository write access (public_repo scope) in Supabase GitHub provider settings.' : `GitHub could not save ${path}: ${data.message || `HTTP ${response.status}`}`);
  return data;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [sites, setSites] = useState<ManagedSite[]>([]);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [activeSiteId, setActiveSiteId] = useState('');
  const [activePageId, setActivePageId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [pageDraft, setPageDraft] = useState<{ title: string; slug: string; body: string; status: 'draft' | 'published' }>(emptyPage);
  const [name, setName] = useState('My Website');
  const [website, setWebsite] = useState('https://example.com');
  const [viewerMode, setViewerMode] = useState<'website'|'app'>('website');
  const [viewerUrl, setViewerUrl] = useState('https://example.com');
  const [pkg, setPkg] = useState('com.example.mywebsite');
  const [iconUrl, setIconUrl] = useState('');
  const [splash, setSplash] = useState('#111827');
  const [tab, setTab] = useState<Tab>('overview');
  const [editorPath, setEditorPath] = useState('README.md');
  const [editorContent, setEditorContent] = useState('');
  const [editorSha, setEditorSha] = useState('');
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [devMode, setDevMode] = useState<'editor'|'importer'>('editor');
  const [sourceRepo, setSourceRepo] = useState('facebook/react');
  const [sourcePath, setSourcePath] = useState('');
  const [sourceFiles, setSourceFiles] = useState<{name:string;path:string;type:string;size?:number}[]>([]);
  const [selectedSourceFile, setSelectedSourceFile] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setNotice('Could not initialize sign-in: ' + error.message);
      setUser(data.session?.user ?? null);
    }).catch(e => { if (alive) setNotice('Could not connect to Supabase. ' + (e instanceof Error ? e.message : '')); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setUser(session?.user ?? null); });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  async function loadProfile(u: User) {
    const { data, error } = await supabase.from('profiles').select('role,display_name').eq('id', u.id).maybeSingle();
    if (error) { setProfile(null); setNotice('Signed in, but profile lookup failed: ' + error.message); return; }
    if (!data) { setProfile(null); setNotice('Your account has no profile row. Check the Supabase on_auth_user_created trigger.'); return; }
    setProfile(data as Profile);
  }
  async function loadBuilds() {
    if (!user) return;
    setLoadingBuilds(true);
    try {
      const { data, error } = await supabase.from('builds')
        .select('id,status,requested_at,apk_url,aab_url,source_zip_url,error_message,projects(name,website_url,package_name)')
        .order('requested_at', { ascending: false }).limit(30);
      if (error) { setNotice('Could not load build history: ' + error.message); return; }
      setBuilds((data ?? []) as unknown as Build[]);
    } catch (e) { setNotice('Could not load build history: ' + (e instanceof Error ? e.message : 'Unknown network error')); }
    finally { setLoadingBuilds(false); }
  }
  async function loadSites(preferredId?: string) {
    if (!user) return;
    const { data, error } = await supabase.from('managed_sites').select('id,name,site_url,description,framework,project_path,status,updated_at').order('updated_at', { ascending: false });
    if (error) { setNotice('Could not load websites: ' + error.message); return; }
    const rows = (data ?? []) as ManagedSite[];
    setSites(rows);
    const nextId = preferredId || (rows.some(s => s.id === activeSiteId) ? activeSiteId : rows[0]?.id || '');
    setActiveSiteId(nextId);
    if (!nextId) { setPages([]); setActivePageId(''); }
  }
  async function loadWorkflowRuns() {
    setLoadingWorkflows(true);
    try {
      const response = await fetch('https://api.github.com/repos/gpldroid/mega/actions/runs?per_page=8');
      if (!response.ok) throw new Error(response.status === 403 ? 'GitHub API rate limit reached. Open the repository Actions page to inspect runs.' : 'GitHub API returned HTTP ' + response.status);
      const data = await response.json() as { workflow_runs?: WorkflowRun[] };
      setWorkflowRuns(data.workflow_runs ?? []);
    } catch (e) {
      setNotice('Could not load GitHub Actions activity: ' + (e instanceof Error ? e.message : 'Unknown network error'));
    } finally {
      setLoadingWorkflows(false);
    }
  }
  async function loadPages(siteId: string) {
    if (!siteId) { setPages([]); setActivePageId(''); return; }
    const { data, error } = await supabase.from('site_pages').select('id,site_id,title,slug,body,status,updated_at').eq('site_id', siteId).order('updated_at', { ascending: false });
    if (error) { setNotice('Could not load site content: ' + error.message); return; }
    const rows = (data ?? []) as SitePage[];
    setPages(rows);
    if (!rows.some(p => p.id === activePageId)) {
      setActivePageId(rows[0]?.id || '');
      const first = rows[0];
      setPageDraft(first ? { title: first.title, slug: first.slug, body: first.body, status: first.status } : emptyPage);
    }
  }
  useEffect(() => {
    if (user) { void loadProfile(user); void loadBuilds(); void loadSites(); }
    else { setProfile(null); setBuilds([]); setSites([]); setPages([]); setActiveSiteId(''); }
  }, [user]);
  useEffect(() => { if (user && activeSiteId) void loadPages(activeSiteId); }, [user, activeSiteId]);
  useEffect(() => { if (user && tab === 'devops') void loadWorkflowRuns(); }, [user, tab]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => { void loadBuilds(); }, 12000);
    return () => window.clearInterval(timer);
  }, [user]);

  async function authSubmit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const result = authMode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setNotice(authMode === 'signup' ? 'Account created. If email confirmation is enabled, check your inbox.' : 'Signed in successfully.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Authentication failed'); }
    finally { setBusy(false); }
  }
  async function signInWithGithub() {
    setBusy(true); setNotice('');
    try {
      const redirectTo = new URL('/mega/', window.location.origin).toString();
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo, scopes: 'public_repo' } });
      if (error) throw error;
    } catch (e) { setNotice(e instanceof Error ? e.message : 'GitHub sign-in could not start'); setBusy(false); }
  }
  async function signOut() { await supabase.auth.signOut(); setNotice('You have signed out.'); setTab('overview'); }
  async function createSite(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!siteName.trim()) { setNotice('Enter a project name.'); return; }
    if (siteUrl.trim() && !validUrl(siteUrl.trim())) { setNotice('Enter a valid HTTP(S) website URL, or leave it blank for a new site.'); return; }
    setBusy(true); setNotice('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const githubToken = session?.provider_token;
      if (!githubToken) throw new Error('To save a project in GitHub, sign in with the GitHub button (not email) and grant repository access.');
      const folder = `webs/projects/${slugify(siteName)}-${Date.now().toString(36)}`;
      const project = {
        name: siteName.trim(), slug: folder.split('/').pop(), website_url: siteUrl.trim() || null,
        description: siteDescription.trim(), framework: 'static', status: 'draft',
        owner_id: user.id, created_at: new Date().toISOString(), project_path: folder
      };
      const starterHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${siteName.trim().replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c))}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:760px;margin:12vh auto;padding:24px;line-height:1.7;color:#172033}h1{font-size:clamp(2rem,6vw,3.5rem)}p{color:#526078}</style>
</head>
<body>
  <main>
    <h1>${siteName.trim().replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c))}</h1>
    <p>${siteDescription.trim().replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c)) || 'Your new website project is ready to customize.'}</p>
    <p>Project source: <code>${folder}</code></p>
  </main>
</body>
</html>`;
      await writeGitHubFile(githubToken, `${folder}/project.json`, JSON.stringify(project, null, 2) + '\n', `Create website project: ${siteName.trim()}`);
      await writeGitHubFile(githubToken, `${folder}/index.html`, starterHtml + '\n', `Add starter page: ${siteName.trim()}`);
      const { data, error } = await supabase.from('managed_sites').insert({
        user_id: user.id, name: siteName.trim(), site_url: siteUrl.trim() || null,
        description: siteDescription.trim(), framework: 'static', project_path: folder, status: 'draft'
      }).select('id').single();
      if (error) throw new Error(`GitHub project saved at ${folder}, but the dashboard record could not be created: ${error.message}`);
      setSiteName(''); setSiteUrl(''); setSiteDescription('');
      await loadSites(data.id); setActiveSiteId(data.id); setTab('content');
      setNotice(`Project saved in GitHub at ${folder}. Starter index.html and project.json were created; workspace is ready for content editing.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not create website project.');
    } finally { setBusy(false); }
  }
  async function savePage(e: FormEvent) {
    e.preventDefault();
    if (!user || !activeSiteId) { setNotice('Create or select a website first.'); return; }
    const slug = slugify(pageDraft.slug || pageDraft.title);
    if (!pageDraft.title.trim()) { setNotice('Enter a page title.'); return; }
    setBusy(true); setNotice('');
    try {
      const payload = { site_id: activeSiteId, user_id: user.id, title: pageDraft.title.trim(), slug, body: pageDraft.body, status: pageDraft.status };
      const result = activePageId
        ? await supabase.from('site_pages').update(payload).eq('id', activePageId).select('id').single()
        : await supabase.from('site_pages').insert(payload).select('id').single();
      if (result.error) throw new Error('Could not save page in Supabase: ' + result.error.message);

      setActivePageId(result.data.id);
      setPageDraft({ ...pageDraft, slug });
      await loadPages(activeSiteId);

      const site = sites.find(item => item.id === activeSiteId);
      if (!site?.project_path) {
        setNotice('Page saved to Supabase. This older website has no GitHub project path yet, so repository sync is unavailable for it.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const githubToken = session?.provider_token;
      if (!githubToken) {
        setNotice('Page saved to Supabase. To also sync it to GitHub, sign in again using the GitHub button and approve repository access.');
        return;
      }

      const safeTitle = escapeHtml(pageDraft.title.trim());
      const safeBody = pageDraft.body.trim()
        ? pageDraft.body.trim().split(/\n\s*\n/).map(paragraph => '<p>' + escapeHtml(paragraph).replace(/\n/g, '<br>') + '</p>').join('\n    ')
        : '<p></p>';
      const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:760px;margin:8vh auto;padding:24px;line-height:1.8;color:#172033}h1{font-size:clamp(2rem,6vw,3.5rem)}a{color:#5145cd}</style>
</head>
<body>
  <main>
    <p><a href="../index.html">← Home</a></p>
    <h1>${safeTitle}</h1>
    ${safeBody}
    <p><small>Content status: ${pageDraft.status}</small></p>
  </main>
</body>
</html>
`;
      const filePath = `${site.project_path}/pages/${slug}.html`;
      await writeGitHubFile(githubToken, filePath, pageHtml, `Sync website page: ${pageDraft.title.trim()}`);
      setNotice(`Page saved to Supabase and synced to GitHub: ${filePath}. This writes the source file; it does not publish a live website by itself.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save page.');
    } finally {
      setBusy(false);
    }
  }
  async function submitBuild(e: FormEvent) {
    e.preventDefault();
    if (!user) { setNotice('Sign in first to request an Android build.'); return; }
    if (!validUrl(website)) { setNotice('Enter a valid HTTP(S) website URL.'); return; }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg)) { setNotice('Package name must look like com.example.app'); return; }
    setBusy(true); setNotice('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('request-build', {
        body: { name, website_url: website, package_name: pkg, icon_url: iconUrl || null, splash_color: splash },
        headers: { Authorization: 'Bearer ' + session?.access_token }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNotice('Build queued! Your build ID is ' + data.build_id); setTab('history'); await loadBuilds();
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not submit build request'); }
    finally { setBusy(false); }
  }

  const counts = useMemo(() => ({
    all: builds.length, ready: builds.filter(b => b.status === 'completed').length,
    running: builds.filter(b => ['pending','building'].includes(b.status)).length
  }), [builds]);
  const activeSite = sites.find(s => s.id === activeSiteId) ?? null;
  const activePage = pages.find(p => p.id === activePageId) ?? null;
  const nav: { id: Tab; label: string; icon: React.ReactNode; group: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={17}/>, group: 'WORKSPACE' },
    { id: 'sites', label: 'Websites', icon: <Globe2 size={17}/>, group: 'WORKSPACE' },
    { id: 'content', label: 'Content Studio', icon: <FileText size={17}/>, group: 'WORKSPACE' },\n    { id: 'developer', label: 'Code & Import Pro', icon: <FileCode2 size={17}/>, group: 'WORKSPACE' },
    { id: 'android', label: 'Android Builder', icon: <Smartphone size={17}/>, group: 'BUILD TOOLS' },
    { id: 'history', label: 'Build history', icon: <History size={17}/>, group: 'BUILD TOOLS' },
    { id: 'devops', label: 'GitHub DevOps', icon: <GitBranch size={17}/>, group: 'BUILD TOOLS' },
    ...(profile?.role === 'admin' ? [{ id: 'admin' as Tab, label: 'Administration', icon: <ShieldCheck size={17}/>, group: 'SYSTEM' }] : [])
  ];

  return <div className="min-h-screen text-slate-100">
    <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 lg:px-8">
      <a href="#" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-300 text-slate-950"><WandSparkles size={22}/></div><div><div className="text-lg font-black tracking-[.18em]">MEGA</div><div className="text-[10px] uppercase tracking-[.22em] text-slate-500">Control Center</div></div></a>
      <div className="flex items-center gap-3">{user ? <><span className="hidden text-sm text-slate-400 sm:block">{user.email}</span><button className="btn btn-quiet text-sm" onClick={signOut}><LogOut size={16}/> Sign out</button></> : <button className="btn btn-quiet text-sm" onClick={() => document.getElementById('account')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><LogIn size={16}/> Sign in</button>}</div>
    </header>

    {!user ? <main className="grid-bg">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-xs font-semibold text-violet-200"><Sparkles size={14}/> ONE WORKSPACE · MANY WEBSITES</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-.055em] sm:text-6xl lg:text-7xl">Build. Manage.<br/><span className="bg-gradient-to-r from-violet-200 via-violet-400 to-sky-300 bg-clip-text text-transparent">Ship with MEGA.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">A central workspace for your websites, page content, deployments and Android app builds. Start with a website, then grow your project tools in one place.</p>
          <div className="mt-8 flex flex-wrap gap-3"><span className="pill flex items-center gap-2"><Globe2 size={14}/> Multi-site workspace</span><span className="pill flex items-center gap-2"><FileText size={14}/> Content Studio</span><span className="pill flex items-center gap-2"><Code2 size={14}/> Android builds</span></div>
          <div className="glass mt-10 max-w-lg rounded-3xl p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><ShieldCheck size={22}/></div><div><div className="font-semibold">One control center</div><div className="mt-1 text-sm text-slate-400">Private projects and content, protected by Supabase Auth and row-level security.</div></div></div></div>
        </div>
        <div id="account" className="glass mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><LogIn size={23}/></div>
          <h2 className="text-2xl font-bold">{authMode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage websites and access your builds.</p>
          <button type="button" disabled={busy} onClick={() => void signInWithGithub()} className="github-btn mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"><Github size={19}/><span>Continue with GitHub</span><ArrowUpRight size={16} className="ml-auto opacity-60"/></button>
          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[.18em] text-slate-600"><span className="h-px flex-1 bg-slate-800"/><span>or use email</span><span className="h-px flex-1 bg-slate-800"/></div>
          <form onSubmit={authSubmit} className="space-y-4"><label className="block text-sm text-slate-300">Email<input className="field mt-2" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label><label className="block text-sm text-slate-300">Password<input className="field mt-2" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label><button disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in with email' : 'Create account'} <ArrowUpRight size={17}/></button></form>
          <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="mt-4 text-sm text-violet-200 hover:underline">{authMode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</button>
          <p className="mt-5 text-xs leading-5 text-slate-500">GitHub sign-in requires the GitHub provider to be enabled in Supabase Auth and its callback URL configured.</p>
          {notice && <Notice message={notice} clear={() => setNotice('')}/>}
        </div>
      </section>
    </main> : <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-16 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
      <aside className="glass h-fit rounded-3xl p-4 lg:sticky lg:top-5">
        <div className="mb-5 rounded-2xl border border-violet-300/15 bg-violet-300/[.06] p-4"><div className="text-[10px] font-bold tracking-[.2em] text-violet-200">WORKSPACE</div><div className="mt-2 truncate font-semibold">{profile?.display_name || user.email || 'MEGA user'}</div><div className="mt-1 text-xs text-slate-500">{profile?.role === 'admin' ? 'Administrator' : 'Project member'}</div></div>
        {['WORKSPACE','BUILD TOOLS','SYSTEM'].map(group => <div key={group} className="mb-4">{nav.filter(n => n.group === group).map(n => <button key={n.id} onClick={() => setTab(n.id)} className={'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition '+(tab === n.id ? 'bg-violet-300/10 font-semibold text-violet-200' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>{n.icon}{n.label}</button>)}</div>)}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-violet-200"/> Free-tier first</div><p className="mt-2 text-xs leading-5 text-slate-500">Static site hosting and GitHub Actions have quota limits. Review usage before large builds.</p></div>
      </aside>
      <section className="glass min-w-0 rounded-3xl p-5 sm:p-7">
        {tab === 'overview' && <><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">MEGA Control Center</div><h1 className="mt-2 text-3xl font-bold">Your workspace</h1><p className="mt-2 text-sm text-slate-400">Manage your websites, content and Android build pipeline.</p></div><span className="pill flex items-center gap-2"><Activity size={14}/> Connected session</span></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Websites',value:sites.length,icon:<Globe2 size={18}/>},{label:'Content pages',value:pages.length,icon:<FileText size={18}/>},{label:'Android builds',value:counts.all,icon:<Smartphone size={18}/>},{label:'Completed builds',value:counts.ready,icon:<CheckCircle2 size={18}/>}].map(k=><div key={k.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{k.label}</span><span className="text-violet-200">{k.icon}</span></div><div className="mt-4 text-3xl font-bold">{k.value}</div></div>)}</div>
          <div className="mt-7 grid gap-4 md:grid-cols-2"><button onClick={() => setTab('sites')} className="action-card text-left"><Globe2 className="text-violet-200" size={22}/><h3 className="mt-4 font-semibold">Create or manage a website</h3><p className="mt-2 text-sm leading-6 text-slate-400">Keep multiple website projects in one workspace.</p><span className="mt-4 inline-flex items-center gap-2 text-sm text-violet-200">Open Websites <ArrowUpRight size={15}/></span></button><button onClick={() => setTab('content')} className="action-card text-left"><FileText className="text-violet-200" size={22}/><h3 className="mt-4 font-semibold">Edit site content</h3><p className="mt-2 text-sm leading-6 text-slate-400">Create pages and save draft content in Supabase.</p><span className="mt-4 inline-flex items-center gap-2 text-sm text-violet-200">Open Content Studio <ArrowUpRight size={15}/></span></button></div>
          <div className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent websites</h2><button className="text-sm text-violet-200" onClick={() => setTab('sites')}>View all</button></div>{sites.length ? <div className="space-y-2">{sites.slice(0,4).map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800"><Globe2 size={18}/></div><div><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.site_url || 'No live URL connected yet'}</div></div></div><span className="pill">{s.status}</span></div>)}</div> : <Empty icon={<Globe2 size={24}/>} title="No website projects yet" detail="Create your first website workspace to begin." action="Create website" onAction={() => setTab('sites')}/>}</div>
        </>}

        {tab === 'sites' && <><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Project management</div><h1 className="mt-2 text-3xl font-bold">Websites</h1><p className="mt-2 text-sm text-slate-400">Each new project is stored in the GitHub repository under webs/projects/&lt;project-slug&gt;/, with project.json and a starter index.html; dashboard settings are also stored in Supabase.</p>
          <form onSubmit={createSite} className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><h2 className="font-semibold">Add a website</h2><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Website / project name<input className="field mt-2" required maxLength={100} value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="My portfolio"/></label><label className="block text-sm text-slate-300">Existing URL <span className="text-slate-600">(optional)</span><input className="field mt-2" type="url" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://example.com"/></label></div><label className="block text-sm text-slate-300">Description<textarea className="field mt-2 min-h-20" value={siteDescription} onChange={e => setSiteDescription(e.target.value)} placeholder="What is this website for?"/></label><div><button disabled={busy} className="btn btn-primary disabled:opacity-50"><Plus size={17}/> Create website project</button></div></form>
          <div className="mt-7"><h2 className="mb-3 font-semibold">Your websites ({sites.length})</h2>{sites.length ? <div className="grid gap-3 md:grid-cols-2">{sites.map(s=><div key={s.id} className={'rounded-2xl border p-5 '+(activeSiteId===s.id?'border-violet-300/40 bg-violet-300/[.04]':'border-slate-800 bg-slate-950/40')}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Globe2 size={20}/></div><div><h3 className="font-semibold">{s.name}</h3><p className="mt-1 text-xs text-slate-500">{s.site_url || 'Draft workspace'}</p></div></div><span className="pill">{s.status}</span></div>{s.description && <p className="mt-3 text-sm text-slate-400">{s.description}</p>}<div className="mt-5 flex flex-wrap gap-2"><button className="btn btn-quiet text-xs" onClick={() => {setActiveSiteId(s.id);setTab('content')}}>Manage content <FileText size={14}/></button>{s.site_url && <a className="btn btn-quiet text-xs" href={s.site_url} target="_blank" rel="noreferrer">Open site <ExternalLink size={14}/></a>}</div></div>)}</div> : <Empty icon={<Globe2 size={24}/>} title="Start with your first site" detail="A website workspace stores its pages and project settings."/>}</div>
        </>}

        {tab === 'content' && <><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Website editor</div><h1 className="mt-2 text-3xl font-bold">Content Studio</h1><p className="mt-2 text-sm text-slate-400">Create pages, edit copy and sync page HTML into your GitHub project folder.</p>
          {!sites.length ? <Empty icon={<Globe2 size={24}/>} title="Create a website first" detail="Pages belong to a website project." action="Go to Websites" onAction={() => setTab('sites')}/> : <div className="mt-6 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]"><aside className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><label className="block text-xs text-slate-500">WEBSITE<select className="field mt-2" value={activeSiteId} onChange={e => {setActiveSiteId(e.target.value);setActivePageId('');setPageDraft(emptyPage)}}>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="mb-3 mt-6 flex items-center justify-between"><h2 className="text-sm font-semibold">Pages</h2><button title="New page" onClick={() => {setActivePageId('');setPageDraft(emptyPage)}} className="rounded-lg border border-slate-700 p-2 text-violet-200"><Plus size={15}/></button></div>{pages.map(p=><button key={p.id} onClick={() => {setActivePageId(p.id);setPageDraft({title:p.title,slug:p.slug,body:p.body,status:p.status})}} className={'mb-2 w-full rounded-xl p-3 text-left '+(activePageId===p.id?'bg-violet-300/10 text-violet-100':'text-slate-400 hover:bg-white/5')}><div className="truncate text-sm font-medium">{p.title}</div><div className="mt-1 truncate text-[11px] text-slate-500">/{p.slug} · {p.status}</div></button>)}{!pages.length && <p className="py-3 text-xs leading-5 text-slate-500">No pages yet. Create one using +.</p>}</aside>
            <form onSubmit={savePage} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{activePage ? 'Edit page' : 'Create a page'}</h2><p className="mt-1 text-xs text-slate-500">Website: {activeSite?.name || 'Selected project'}</p></div><span className="pill">{pageDraft.status}</span></div><label className="block text-sm text-slate-300">Page title<input className="field mt-2" required maxLength={160} value={pageDraft.title} onChange={e => setPageDraft(d=>({...d,title:e.target.value,slug:activePageId?d.slug:slugify(e.target.value)}))}/></label><label className="mt-4 block text-sm text-slate-300">URL slug<input className="field mt-2" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={pageDraft.slug} onChange={e => setPageDraft(d=>({...d,slug:slugify(e.target.value)}))}/></label><label className="mt-4 block text-sm text-slate-300">Page content / draft<textarea className="field mt-2 min-h-64 resize-y leading-7" value={pageDraft.body} onChange={e => setPageDraft(d=>({...d,body:e.target.value}))} placeholder="Write your page content here…"/></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={pageDraft.status==='published'} onChange={e=>setPageDraft(d=>({...d,status:e.target.checked?'published':'draft'}))}/> Mark as published in workspace</label><button disabled={busy} className="btn btn-primary disabled:opacity-50"><Save size={16}/>{busy?'Saving…':'Save page'}</button></div><p className="mt-4 text-xs leading-5 text-slate-500">Saving stores the page in Supabase and, when GitHub access is available, writes an HTML source file under webs/projects/&lt;project&gt;/pages/. This does not publish a live website automatically.</p></form></div>}
        </>}

        {tab === 'android' && <><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Build tools</div><h1 className="mt-2 text-3xl font-bold">Android Builder</h1><p className="mt-2 text-sm text-slate-400">Configure a website and request APK, AAB and source ZIP artifacts.</p></div><span className="pill">Free-tier pipeline</span></div>
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
              <div><div className="flex items-center gap-2 font-semibold"><Eye size={17} className="text-violet-200"/> Website &amp; App Viewer</div><p className="mt-1 text-xs text-slate-500">Preview the website and see how it will appear in a mobile app container.</p></div>
              <div className="flex rounded-xl border border-slate-700 p-1">
                <button type="button" onClick={() => setViewerMode('website')} className={'flex items-center gap-2 rounded-lg px-3 py-2 text-xs '+(viewerMode==='website'?'bg-violet-300/15 text-violet-100':'text-slate-400')}><Monitor size={14}/> Website</button>
                <button type="button" onClick={() => {setViewerMode('app'); setViewerUrl(website)}} className={'flex items-center gap-2 rounded-lg px-3 py-2 text-xs '+(viewerMode==='app'?'bg-violet-300/15 text-violet-100':'text-slate-400')}><Smartphone size={14}/> App view</button>
              </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,300px)]">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-400">Preview URL</label>
                <div className="mt-2 flex gap-2"><input className="field min-w-0 flex-1" type="url" value={viewerUrl} onChange={e=>setViewerUrl(e.target.value)} placeholder="https://yourwebsite.com"/><button type="button" className="btn btn-quiet text-xs" onClick={()=>{if(validUrl(viewerUrl)){setWebsite(viewerUrl);setViewerMode('website')}else setNotice('Enter a valid HTTP(S) preview URL.')}}>Use URL</button></div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-700 bg-white" style={{height: viewerMode==='website'?'430px':'500px'}}>
                  {validUrl(viewerUrl) ? <iframe key={viewerMode+viewerUrl} title={viewerMode==='website'?'Website preview':'Android WebView preview'} src={viewerUrl} className={'h-full w-full '+(viewerMode==='app'?'mx-auto max-w-[340px] border-x-[8px] border-slate-900':'')} sandbox="allow-forms allow-scripts allow-same-origin allow-popups" referrerPolicy="strict-origin-when-cross-origin" /> : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">Enter a valid website URL to preview it here.</div>}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Some websites block embedded previews using X-Frame-Options or Content-Security-Policy. If the frame is blank, open the URL in a new tab to verify the site.</p>
                <a className="mt-3 inline-flex items-center gap-2 text-xs text-violet-200" href={validUrl(viewerUrl)?viewerUrl:undefined} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open preview in new tab</a>
              </div>
              <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex w-full items-center justify-between text-xs text-slate-500"><span>Android device preview</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Live</span></div>
                <div className="w-full max-w-[250px] rounded-[2rem] border-[5px] border-slate-700 bg-black p-2 shadow-2xl">
                  <div className="mb-2 flex h-5 items-center justify-center"><div className="h-1.5 w-14 rounded-full bg-slate-700"/></div>
                  <div className="overflow-hidden rounded-[1.3rem] bg-white" style={{height:'390px'}}>
                    {validUrl(viewerUrl) ? <iframe key={'phone-'+viewerUrl} title="Mobile app preview" src={viewerUrl} className="h-full w-full" sandbox="allow-forms allow-scripts allow-same-origin allow-popups" referrerPolicy="strict-origin-when-cross-origin"/> : <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-500">Enter a valid URL</div>}
                  </div>
                  <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-slate-700"/>
                </div>
                <div className="mt-4 w-full rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">App name</div><div className="mt-1 truncate text-sm font-medium">{name || 'My Website'}</div><div className="mt-2 text-xs text-slate-500">Package</div><div className="mt-1 break-all font-mono text-[11px] text-slate-300">{pkg || 'com.example.app'}</div><div className="mt-2 text-xs text-slate-500">Splash color</div><div className="mt-1 flex items-center gap-2 text-xs"><span className="h-4 w-4 rounded border border-white/20" style={{background:splash}}/>{splash}</div></div>
              </div>
            </div>
          </section>
          <form onSubmit={submitBuild} className="mt-7 space-y-5"><label className="block text-sm font-medium text-slate-300">Website URL<input className="field mt-2" type="url" required value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourwebsite.com"/><span className="mt-1 block text-xs text-slate-500">The website must allow loading inside a WebView.</span></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-300">App name<input className="field mt-2" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label className="block text-sm font-medium text-slate-300">Package name<input className="field mt-2" required value={pkg} onChange={e=>setPkg(e.target.value)} placeholder="com.example.app"/></label></div><label className="block text-sm font-medium text-slate-300">App icon URL <span className="text-slate-600">(optional)</span><input className="field mt-2" type="url" value={iconUrl} onChange={e=>setIconUrl(e.target.value)} placeholder="https://example.com/icon.png"/></label><label className="block text-sm font-medium text-slate-300">Splash / system bar color<div className="mt-2 flex gap-3"><input type="color" value={splash} onChange={e=>setSplash(e.target.value)} className="h-11 w-14 rounded-lg border border-slate-700 bg-slate-900 p-1"/><input className="field" value={splash} onChange={e=>setSplash(e.target.value)} pattern="^#[0-9a-fA-F]{6}$"/></div></label><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs leading-5 text-slate-400"><ShieldCheck size={15} className="mr-2 inline text-emerald-300"/> Requests are tied to your account. Build status and download links follow Supabase row-level security.</div><button disabled={busy} className="btn btn-primary w-full disabled:opacity-50">{busy?'Submitting build…':'Generate Android app'} <Rocket size={17}/></button></form></>}

        {tab === 'history' && <><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Activity</div><h1 className="mt-2 text-3xl font-bold">Build history</h1></div><button className="btn btn-quiet text-xs" onClick={() => void loadBuilds()}><History size={15}/> Refresh</button></div><p className="mt-2 text-sm text-slate-400">Status refreshes automatically every 12 seconds.</p><div className="mt-6 space-y-3">{loadingBuilds && !builds.length ? <p className="py-8 text-center text-sm text-slate-500">Loading build history…</p> : builds.length === 0 ? <Empty icon={<Terminal size={24}/>} title="No builds yet" detail="Create your first Android app to see it here." action="Open Android Builder" onAction={() => setTab('android')}/> : builds.map(b=><div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{b.projects?.name ?? 'Android build'}</div><div className="mt-1 max-w-sm truncate text-xs text-slate-500">{b.projects?.website_url ?? b.id}</div><div className="mt-2 text-[11px] text-slate-600">{new Date(b.requested_at).toLocaleString()}</div></div><span className={'pill flex items-center gap-1 '+(b.status==='completed'?'text-emerald-300':b.status==='failed'?'text-rose-300':'text-amber-200')}>{b.status==='completed'?<CheckCircle2 size={13}/>:b.status==='failed'?<XCircle size={13}/>:<Clock3 size={13}/>} {statusText[b.status]??b.status}</span></div>{b.error_message && <p className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-200">{b.error_message}</p>}{b.status==='completed' && <div className="mt-4 flex flex-wrap gap-2">{[[b.apk_url,'APK'],[b.aab_url,'AAB'],[b.source_zip_url,'Source ZIP']].filter(([url])=>url).map(([url,label])=><a key={label as string} className="btn btn-quiet text-xs" href={url as string} target="_blank" rel="noreferrer"><Download size={14}/>{label as string}</a>)}</div>}</div>)}</div></>}

        {tab === 'devops' && <><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Delivery pipeline</div><h1 className="mt-2 text-3xl font-bold">GitHub DevOps</h1><p className="mt-2 text-sm text-slate-400">Recent workflow runs for the MEGA repository. Open a run to inspect build/deployment logs.</p></div><button className="btn btn-quiet text-xs" onClick={() => void loadWorkflowRuns()} disabled={loadingWorkflows}><RefreshCw size={15} className={loadingWorkflows?'animate-spin':''}/> Refresh runs</button></div><div className="mt-6 space-y-3">{loadingWorkflows && !workflowRuns.length ? <p className="py-8 text-center text-sm text-slate-500">Loading GitHub Actions…</p> : workflowRuns.length ? workflowRuns.map(run => <div key={run.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="font-semibold">{run.display_title || run.name}</div><div className="mt-1 text-xs text-slate-500">{run.name} · {run.head_branch} · {run.head_sha.slice(0,7)}</div><div className="mt-2 text-[11px] text-slate-600">{new Date(run.created_at).toLocaleString()}</div></div><span className={'pill '+(run.conclusion==='success'?'text-emerald-300':run.conclusion==='failure'?'text-rose-300':'text-amber-200')}>{run.conclusion || run.status}</span></div><a href={run.html_url} target="_blank" rel="noreferrer" className="btn btn-quiet mt-4 text-xs">Open run logs <ExternalLink size={14}/></a></div>) : <Empty icon={<GitBranch size={24}/>} title="No workflow runs found" detail="Check the repository Actions page for current workflow activity."/>}</div><div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4"><div className="font-semibold text-amber-100">Integration boundary</div><p className="mt-2 text-sm leading-6 text-slate-400">This panel reads public workflow activity for gpldroid/mega. Dispatching workflows, managing repository secrets, or deploying arbitrary new repositories requires a separately authorized GitHub App/token and must run server-side—not in this public frontend.</p><a className="mt-3 inline-flex items-center gap-2 text-sm text-violet-200" href="https://github.com/gpldroid/mega/actions" target="_blank" rel="noreferrer">Open repository Actions <ExternalLink size={14}/></a></div></>}

        {tab === 'developer' && <><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">Developer workspace</div><h1 className="mt-2 text-3xl font-bold">Code Editor &amp; Repository Importer Pro</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Edit text-based files directly in the MEGA repository, or browse a source repository and import individual files into the selected website project.</p></div><span className="pill flex items-center gap-2"><ShieldCheck size={14}/> GitHub OAuth</span></div>
          <div className="mt-6 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2"><button type="button" onClick={()=>setDevMode('editor')} className={'btn text-xs '+(devMode==='editor'?'btn-primary':'btn-quiet')}><Code2 size={15}/> Code Editor</button><button type="button" onClick={()=>setDevMode('importer')} className={'btn text-xs '+(devMode==='importer'?'btn-primary':'btn-quiet')}><FolderInput size={15}/> Repository Importer Pro</button></div>
          {devMode==='editor' ? <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1020]"><div className="flex flex-wrap items-center gap-2 border-b border-slate-800 p-3"><label className="min-w-0 flex-1 text-xs text-slate-400">Repository file path<input className="field mt-2 font-mono text-xs" value={editorPath} onChange={e=>{setEditorPath(e.target.value);setEditorDirty(true)}} placeholder="README.md"/></label><button type="button" className="btn btn-quiet mt-5 text-xs" disabled={editorLoading||busy} onClick={async()=>{const path=safeRepoPath(editorPath);if(!path){setNotice('Enter a valid repository file path.');return;}setEditorLoading(true);setNotice('');try{const {data:{session}}=await supabase.auth.getSession();const token=session?.provider_token;if(!token)throw new Error('Sign in using GitHub to access repository files.');const response=await fetch('https://api.github.com/repos/gpldroid/mega/contents/'+path.split('/').map(encodeURIComponent).join('/'),{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});const data=await response.json();if(!response.ok)throw new Error(data.message||'Could not load file.');if(data.type!=='file'||!data.content)throw new Error('Choose a text file, not a directory or binary file.');setEditorContent(decodeBase64(data.content));setEditorSha(data.sha);setEditorPath(path);setEditorLoaded(true);setEditorDirty(false);setNotice('Loaded '+path+' from gpldroid/mega.');}catch(err){setNotice(err instanceof Error?err.message:'Could not load file.');}finally{setEditorLoading(false);}}}><Search size={14}/>{editorLoading?'Loading…':'Open file'}</button><button type="button" className="btn btn-primary mt-5 text-xs" disabled={busy||!editorLoaded} onClick={async()=>{const path=safeRepoPath(editorPath);if(!path){setNotice('Enter a valid file path.');return;}setBusy(true);setNotice('');try{const {data:{session}}=await supabase.auth.getSession();const token=session?.provider_token;if(!token)throw new Error('Sign in using GitHub to save repository files.');const response=await fetch('https://api.github.com/repos/gpldroid/mega/contents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({message:'Edit repository file via MEGA Code Editor: '+path,content:encodeBase64(editorContent),sha:editorSha,branch:'main'})});const data=await response.json();if(!response.ok)throw new Error(data.message||'GitHub save failed.');setEditorSha(data.content?.sha||editorSha);setEditorDirty(false);setNotice('Saved '+path+' to GitHub. A workflow may run if the changed file triggers deployment.');}catch(err){setNotice(err instanceof Error?err.message:'Could not save file.');}finally{setBusy(false);}}}><Save size={14}/>{busy?'Saving…':'Commit file'}</button></div>
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-[11px] text-slate-500"><span className="font-mono">gpldroid/mega / {editorPath||'file'}</span><span>{editorDirty?'Unsaved changes':editorLoaded?'Loaded from GitHub':'Open a file to begin'}</span></div><textarea spellCheck={false} value={editorContent} onChange={e=>{setEditorContent(e.target.value);setEditorDirty(true)}} placeholder={'// Open a text file from the repository to edit it here…'} className="min-h-[420px] w-full resize-y bg-transparent p-4 font-mono text-xs leading-6 text-sky-100 outline-none sm:text-sm" /></div>
            : <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><h2 className="flex items-center gap-2 font-semibold"><FolderInput size={17} className="text-violet-200"/> Source repository</h2><p className="mt-2 text-xs leading-5 text-slate-500">Enter a public repository or one your GitHub account can access. The importer reads its file listing; it does not clone or execute source code.</p><label className="mt-4 block text-sm text-slate-300">Owner / repository<input className="field mt-2 font-mono text-xs" value={sourceRepo} onChange={e=>setSourceRepo(e.target.value)} placeholder="owner/repository"/></label><label className="mt-4 block text-sm text-slate-300">Folder path <span className="text-slate-500">(optional)</span><input className="field mt-2 font-mono text-xs" value={sourcePath} onChange={e=>setSourcePath(e.target.value)} placeholder="src or leave blank for root"/></label><button type="button" disabled={importLoading||busy} className="btn btn-primary mt-4" onClick={async()=>{const repo=sourceRepo.trim();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)){setNotice('Use owner/repository format.');return;}setImportLoading(true);setNotice('');try{const {data:{session}}=await supabase.auth.getSession();const token=session?.provider_token;const headers:HeadersInit={Accept:'application/vnd.github+json'};if(token)headers.Authorization='Bearer '+token;const path=safeRepoPath(sourcePath);const url='https://api.github.com/repos/'+repo.split('/').map(encodeURIComponent).join('/')+'/contents'+(path?'/'+path.split('/').map(encodeURIComponent).join('/'):'');const response=await fetch(url,{headers});const data=await response.json();if(!response.ok)throw new Error(data.message||'Could not read source repository.');const files=Array.isArray(data)?data.filter((x:any)=>x.type==='file').map((x:any)=>({name:x.name,path:x.path,type:x.type,size:x.size})):data.type==='file'?[{name:data.name,path:data.path,type:data.type,size:data.size}]:[];setSourceFiles(files);setSelectedSourceFile(files[0]?.path||'');if(!files.length)setNotice('No files at this level. Enter a folder path or check repository access.');}catch(err){setNotice(err instanceof Error?err.message:'Could not inspect source repository.');}finally{setImportLoading(false);}}}><Search size={15}/>{importLoading?'Scanning…':'Scan repository'}</button><div className="mt-5 text-xs text-slate-500">{sourceFiles.length} file(s) found at this level</div><div className="mt-2 max-h-64 space-y-1 overflow-auto">{sourceFiles.map(file=><label key={file.path} className={'flex cursor-pointer items-center gap-3 rounded-lg p-3 text-sm '+(selectedSourceFile===file.path?'bg-violet-300/10 text-violet-100':'text-slate-300 hover:bg-white/5')}><input type="radio" name="source-file" checked={selectedSourceFile===file.path} onChange={()=>setSelectedSourceFile(file.path)}/><FileText size={15}/><span className="min-w-0 flex-1 truncate font-mono text-xs">{file.path}</span><span className="text-[10px] text-slate-600">{file.size==null?'':Math.ceil(file.size/1024)+' KB'}</span></label>)}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><h2 className="font-semibold">Import destination</h2><p className="mt-2 text-xs leading-5 text-slate-500">Select a website project first. The chosen source file will be copied into that project's imports folder as a new file.</p><div className="mt-4 rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">Target website</div><div className="mt-1 font-medium">{activeSite?.name||'No website selected'}</div><div className="mt-1 break-all font-mono text-[11px] text-slate-500">{activeSite?.project_path||'Open Websites and select a project first'}</div></div><div className="mt-4 rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">Selected source</div><div className="mt-1 break-all font-mono text-xs">{selectedSourceFile||'No file selected'}</div><div className="mt-1 text-xs text-slate-500">Text files only in this first release (e.g. .md, .json, .ts, .tsx, .css, .html, .yml).</div></div><button type="button" className="btn btn-primary mt-5 w-full" disabled={busy||importLoading||!activeSite?.project_path||!selectedSourceFile} onClick={async()=>{setBusy(true);setNotice('');try{const repo=sourceRepo.trim();const {data:{session}}=await supabase.auth.getSession();const token=session?.provider_token;if(!token)throw new Error('Sign in using GitHub before importing files.');const sourceUrl='https://api.github.com/repos/'+repo.split('/').map(encodeURIComponent).join('/')+'/contents/'+selectedSourceFile.split('/').map(encodeURIComponent).join('/');const sourceResponse=await fetch(sourceUrl,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});const sourceData=await sourceResponse.json();if(!sourceResponse.ok)throw new Error(sourceData.message||'Could not read source file.');if(sourceData.type!=='file'||!sourceData.content)throw new Error('This source is not a supported text file.');const content=decodeBase64(sourceData.content);if(content.includes('\u0000'))throw new Error('Binary files are not supported by this importer yet.');const fileName=safeRepoPath(selectedSourceFile).split('/').pop()||'imported.txt';const targetPath=activeSite.project_path+'/imports/'+fileName;const {data:{session:currentSession}}=await supabase.auth.getSession();const writeToken=currentSession?.provider_token;if(!writeToken)throw new Error('GitHub session expired. Sign in again.');const put=await fetch('https://api.github.com/repos/gpldroid/mega/contents/'+targetPath.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:{Authorization:'Bearer '+writeToken,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({message:'Import '+repo+'/'+selectedSourceFile+' into '+activeSite.name,content:encodeBase64(content),branch:'main'})});const result=await put.json();if(!put.ok)throw new Error(result.message||'Import failed. If the target already exists, rename or remove it before retrying.');setNotice('Imported '+selectedSourceFile+' to '+targetPath+'. The source file was copied as text; dependencies and build configuration are not installed automatically.');}catch(err){setNotice(err instanceof Error?err.message:'Import failed.');}finally{setBusy(false);}}}><FilePlus2 size={16}/>{busy?'Importing…':'Import selected file'}</button><p className="mt-4 text-xs leading-5 text-slate-500">Pro workflow: inspect first, choose one file, then import. Existing files are not overwritten. Never import secrets or files containing credentials.</p></div></div>}
          <div className="mt-5 rounded-xl border border-sky-300/10 bg-sky-300/[.04] p-4 text-xs leading-5 text-slate-400"><ShieldCheck size={15} className="mr-2 inline text-sky-200"/> Security note: GitHub OAuth tokens are used only in the browser request and are not stored in Supabase. Avoid editing workflow or security files unless you understand the deployment impact.</div>
        </>}

        {tab === 'admin' && <><div className="text-xs font-bold uppercase tracking-[.2em] text-violet-200">System</div><h1 className="mt-2 text-3xl font-bold">Administration</h1><p className="mt-2 text-sm text-slate-400">Admin access detected. User roles must be managed securely in Supabase, never in client-side form fields.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{[['Websites',sites.length],['Completed builds',counts.ready],['In progress',counts.running]].map(([t,n])=><div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4" key={t}><div className="text-2xl font-bold">{n}</div><div className="mt-1 text-xs text-slate-500">{t}</div></div>)}</div><a className="btn btn-quiet mt-5" href="https://github.com/gpldroid/mega/actions" target="_blank" rel="noreferrer">View GitHub Actions <ExternalLink size={15}/></a></>}
        {notice && <Notice message={notice} clear={() => setNotice('')}/>}
      </section>
    </main>}
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs text-slate-600 lg:px-8"><span>© {new Date().getFullYear()} MEGA · Control Center</span><span className="flex items-center gap-2"><ShieldCheck size={14}/> Supabase Auth · Row-level security · GitHub Actions</span></footer>
  </div>;
}

function Notice({ message, clear }: { message: string; clear: () => void }) {
  return <div className="mt-5 flex items-start gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 p-3 text-sm text-violet-100"><CircleHelp className="mt-0.5 shrink-0" size={16}/><span className="flex-1 break-words">{message}</span><button onClick={clear} aria-label="Dismiss"><XCircle size={16}/></button></div>;
}
function Empty({ icon, title, detail, action, onAction }: { icon: React.ReactNode; title: string; detail: string; action?: string; onAction?: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center"><div className="mx-auto flex justify-center text-slate-500">{icon}</div><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p>{action && onAction && <button className="btn btn-primary mt-4" onClick={onAction}>{action}</button>}</div>;
}
export default App;
