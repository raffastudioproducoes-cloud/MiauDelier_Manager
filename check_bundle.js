fetch('https://raffastudioproducoes-cloud.github.io/MiauDelier_Manager/index.html')
  .then(r => r.text())
  .then(t => {
    const match = t.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
    if(match) {
      // It's usually like /MiauDelier_Manager/assets/index-xxx.js
      let path = match[1];
      if (path.startsWith('/MiauDelier_Manager/')) {
         path = path.replace('/MiauDelier_Manager/', '');
      }
      const jsUrl = 'https://raffastudioproducoes-cloud.github.io/MiauDelier_Manager/' + path;
      console.log('Found JS:', jsUrl);
      fetch(jsUrl).then(r2=>r2.text()).then(t2 => {
        console.log('JS contains supabase url?', t2.includes('dimjnihremxztedueoob.supabase.co'));
        console.log('Contains localhost:54321?', t2.includes('localhost:54321'));
        if (!t2.includes('dimjnihremxztedueoob.supabase.co')) {
          console.log('Searching for VITE_SUPABASE_URL alternative...', t2.match(/VITE_SUPABASE_URL/g));
        }
      })
    } else {
      console.log('No script tag found', t.substring(0, 500));
    }
  })
  .catch(e => console.error(e));
