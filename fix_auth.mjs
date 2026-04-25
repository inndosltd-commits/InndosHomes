import fs from 'fs';

const path = 'client/src/lib/auth.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldString = `    const signup = (role: UserRole, name: string, email: string) => {
    if (!role) return;
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      name: name || \`New \${role}\`,
      email: email || \`new_\${role}@example.com\`,
      role: role as any,
    };
    setUser(newUser);
    localStorage.setItem("inndos_user", JSON.stringify(newUser));
    setLocation("/dashboard");
  };`;

const newString = `    const signup = (role: UserRole, name: string, email: string) => {
    if (!role) return;
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 11),
      name: name || \`New \${role}\`,
      email: email || \`new_\${role}@example.com\`,
      role: role as any,
    };
    
    // Check if user already exists
    let mockUser;
    if (email) {
      if (role === "admin") mockUser = ADMINS.find(u => u.email === email);
      else if (role === "owner") mockUser = OWNERS.find(u => u.email === email);
      else if (role === "tenant") mockUser = TENANTS.find(u => u.email === email);
      else if (role === "host") mockUser = HOSTS.find(u => u.email === email);
      else if (role === "guest") mockUser = GUESTS.find(u => u.email === email);
    }
    
    if (mockUser) {
        // If user already exists, login instead of signup
        setUser(mockUser);
        localStorage.setItem("inndos_user", JSON.stringify(mockUser));
    } else {
        setUser(newUser);
        localStorage.setItem("inndos_user", JSON.stringify(newUser));
    }
    
    setLocation("/dashboard");
  };`;

content = content.replace(oldString, newString);
fs.writeFileSync(path, content);
console.log('Fixed signup logic');
