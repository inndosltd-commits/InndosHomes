import fs from 'fs';

const pathApp = 'client/src/App.tsx';
let appContent = fs.readFileSync(pathApp, 'utf8');

if (!appContent.includes('import About from "@/pages/About";')) {
    appContent = appContent.replace(
        'import Home from "@/pages/Home";',
        'import Home from "@/pages/Home";\nimport About from "@/pages/About";'
    );
    appContent = appContent.replace(
        '<Route path="/" component={Home}/>',
        '<Route path="/" component={Home}/>\n      <Route path="/about" component={About}/>'
    );
    fs.writeFileSync(pathApp, appContent);
    console.log("Added About route to App.tsx");
}
