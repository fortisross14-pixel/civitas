import {defineConfig} from 'vite';

// Project sites: https://owner.github.io/repository/
// User/organization sites (repository owner.github.io) deploy at root.
export default defineConfig(()=>{
  const repo=process.env.GITHUB_REPOSITORY?.split('/').pop()||'civitas';
  const base=process.env.GITHUB_PAGES==='true'
    ?(repo.toLowerCase().endsWith('.github.io')?'/':`/${repo}/`)
    :'/';
  return {base,build:{outDir:'dist'}};
});
