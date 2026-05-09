/**
 * @jest-environment node
 *
 * Regresiones para el hardening del 8-may:
 *  - createPost / updatePostBody / updatePostFrontmatter / syncCoverToFrontmatter
 *    escriben de forma atómica (tmp + rename) — un crash a media escritura no
 *    deja el .mdx corrupto.
 *  - deletePost soft-deletea: el .mdx aterriza en `${postsDir}/.trash/<ts>-<basename>`
 *    en lugar de desaparecer del filesystem. walkMdx ignora `.trash/`, así que
 *    `listPostsFromDisk` no lo ve.
 */
import * as fs from 'fs'
import * as path from 'path'

// Lectura via bracket notation y diferida en cada test, por si alguna capa
// (next/jest, jsdom) inlinea o reset-ea process.env entre setupFiles y el
// momento del test.
const dir = (): string => {
  const v = process['env']['BLOG_POSTS_DIR']
  if (!v) throw new Error('jest.global-setup did not seed BLOG_POSTS_DIR')
  return v
}

beforeEach(() => {
  fs.mkdirSync(dir(), { recursive: true })
})

afterEach(() => {
  for (const entry of fs.readdirSync(dir())) {
    fs.rmSync(path.join(dir(), entry), { recursive: true, force: true })
  }
})

describe('atomic write — no leaves .tmp orphans on success', () => {
  it('createPost no deja ficheros .tmp huérfanos en el dir', async () => {
    const { createPost } = await import('@/lib/blog/posts-write')
    await createPost({
      title: 'Atomic Write Smoke',
      description: 'Smoke test para verificar que createPost no deja .tmp tras escribir',
      content: 'Cuerpo lo bastante largo para superar la validación mínima de 50 caracteres del helper.',
      locale: 'es',
    })
    const entries = fs.readdirSync(dir())
    const tmps = entries.filter(e => e.includes('.tmp-'))
    expect(tmps).toEqual([])
    expect(entries.some(e => e === 'atomic-write-smoke.mdx')).toBe(true)
  })
})

describe('soft-delete — files land in .trash/, not removed', () => {
  it('deletePost mueve el .mdx a .trash/ con prefijo timestamp', async () => {
    const { createPost, deletePost } = await import('@/lib/blog/posts-write')
    await createPost({
      title: 'Soft Delete Subject',
      description: 'Post creado para verificar que el delete deja una copia en .trash/',
      content: 'Contenido suficiente para superar la validación mínima de la herramienta de creación.',
      locale: 'es',
    })
    const slug = 'soft-delete-subject'
    expect(fs.existsSync(path.join(dir(), `${slug}.mdx`))).toBe(true)

    await deletePost({ slug, locale: 'es', confirm: true })

    expect(fs.existsSync(path.join(dir(), `${slug}.mdx`))).toBe(false)

    const trashDir = path.join(dir(), '.trash')
    expect(fs.existsSync(trashDir)).toBe(true)
    const trashEntries = fs.readdirSync(trashDir)
    const matching = trashEntries.filter(name =>
      name.endsWith(`${slug}.mdx`) && /^\d{4}-\d{2}-\d{2}T/.test(name)
    )
    expect(matching).toHaveLength(1)
  })

  it('listPostsFromDisk ignora ficheros bajo .trash/ (walkMdx skips dot-dirs)', async () => {
    const { createPost, deletePost } = await import('@/lib/blog/posts-write')
    const { listPostsFromDisk, clearPostsRuntimeCache } = await import('@/lib/blog/posts-runtime')

    await createPost({
      title: 'Trash Visibility Probe',
      description: 'Post diseñado para acabar en la papelera y comprobar que el reader no lo ve',
      content: 'Contenido suficiente para superar la validación mínima de la herramienta de creación.',
      locale: 'es',
    })
    const slug = 'trash-visibility-probe'

    await deletePost({ slug, locale: 'es', confirm: true })

    clearPostsRuntimeCache()
    const posts = await listPostsFromDisk()
    expect(posts.find(p => p.slug === slug)).toBeUndefined()
  })
})
