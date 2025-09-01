// functions/_auth.js
export function requireUser(event) {
  const user = event?.clientContext?.user;
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  return { user };
}

export function hasRole(user, role) {
  const roles = user?.app_metadata?.roles || [];
  return Array.isArray(roles) && roles.includes(role);
}
