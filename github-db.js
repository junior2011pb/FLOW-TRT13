(() => {
    const config = window.FLOW_CONFIG || {};
    const supabaseLibrary = window.supabase;
    const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && supabaseLibrary?.createClient);
    const client = configured
        ? supabaseLibrary.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            })
        : null;

    async function requireAdmin() {
        if (!client) throw new Error('Supabase não está configurada neste frontend.');
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) throw new Error('Faça login para gravar.');

        const { data: isAdmin, error } = await client.rpc('flow_is_admin');
        if (error) throw error;
        if (isAdmin !== true) throw new Error('Este usuário não tem perfil de administrador do FLOW.');
        return sessionData.session;
    }

    async function carregarDados() {
        if (!client) throw new Error('Supabase URL ou chave pública ausente em flow-config.js.');
        const { data, error } = await client
            .from('flow_state')
            .select('records, revision')
            .eq('id', 1)
            .maybeSingle();
        if (error) throw error;
        return data || { records: [], revision: 0 };
    }

    async function salvarDados(records, expectedRevision) {
        await requireAdmin();
        const { data, error } = await client.rpc('flow_save_state', {
            p_records: records,
            p_expected_revision: expectedRevision
        });
        if (error) throw error;
        return { revision: Number(data) };
    }

    async function carregarAssets() {
        if (!client) throw new Error('Supabase URL ou chave pública ausente em flow-config.js.');
        const { data, error } = await client
            .from('flow_assets')
            .select('logo_data, revision')
            .eq('id', 1)
            .maybeSingle();
        if (error) throw error;
        return data || { logo_data: null, revision: 0 };
    }

    async function salvarLogo(logoData, expectedRevision) {
        await requireAdmin();
        const { data, error } = await client.rpc('flow_save_logo', {
            p_logo_data: logoData,
            p_expected_revision: expectedRevision
        });
        if (error) throw error;
        return { revision: Number(data) };
    }

    async function entrarAdmin(email, password) {
        if (!client) throw new Error('Supabase URL ou chave pública ausente em flow-config.js.');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try {
            const { data: isAdmin, error: roleError } = await client.rpc('flow_is_admin');
            if (roleError) throw roleError;
            if (isAdmin !== true) throw new Error('Este usuário não tem perfil de administrador do FLOW.');
            return { token: data.session.access_token, email: data.user.email };
        } catch (error) {
            await client.auth.signOut();
            throw error;
        }
    }

    async function restaurarSessao() {
        if (!client) return { authenticated: false };
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session) return { authenticated: false };
        const { data: isAdmin, error: roleError } = await client.rpc('flow_is_admin');
        if (roleError) throw roleError;
        if (!isAdmin) {
            await client.auth.signOut();
            return { authenticated: false };
        }
        return { authenticated: true, token: data.session.access_token, email: data.session.user.email };
    }

    async function sairAdmin() {
        if (client) {
            const { error } = await client.auth.signOut();
            if (error) throw error;
        }
    }

    async function alterarSenha(currentPassword, newPassword) {
        const session = await requireAdmin();
        const email = session.user.email;
        const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword });
        if (verifyError) throw verifyError;
        const { data, error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return data.user;
    }

    window.flowDb = {
        isConfigured: configured,
        carregarDados,
        salvarDados,
        carregarAssets,
        salvarLogo,
        entrarAdmin,
        restaurarSessao,
        sairAdmin,
        alterarSenha
    };
})();
