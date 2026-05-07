// Red de seguridad para BUG-15.
// Aborta jest si BLOG_POSTS_DIR resuelve al volumen de producción
// (/var/lib/e2d-content) o si content/posts es un symlink hacia él
// y el test no ha definido BLOG_POSTS_DIR explícitamente.
const fs = require('fs');
const path = require('path');

const PROD_PREFIX = '/var/lib/e2d-content';

function resolveSafe(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

module.exports = async function prodGuard() {
  const explicit = process.env.BLOG_POSTS_DIR;
  if (explicit) {
    const resolved = resolveSafe(explicit);
    if (resolved.startsWith(PROD_PREFIX)) {
      throw new Error(
        `TEST_PROD_GUARD: BLOG_POSTS_DIR=${explicit} -> ${resolved}, dentro del volumen de producción (${PROD_PREFIX}). Aborto. Ver BUG-15.`
      );
    }
    return;
  }
  const fallback = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(fallback)) return;
  const real = resolveSafe(fallback);
  if (real.startsWith(PROD_PREFIX)) {
    throw new Error(
      `TEST_PROD_GUARD: ${fallback} -> ${real}, en el volumen de producción (${PROD_PREFIX}). Define BLOG_POSTS_DIR a un tmpdir antes de jest. Ver BUG-15.`
    );
  }
};
