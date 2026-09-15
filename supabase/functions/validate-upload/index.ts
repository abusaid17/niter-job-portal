// Edge Function: validate-upload
// Re-checks MIME type / extension before serving uploaded files.

Deno.serve(async (req) => {
  const form = await req.formData()
  const file = form.get('file')
  const bucket = form.get('bucket')

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: 'missing file' }, { status: 400 })
  }

  const allowed = {
    cvs: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    photos: ['image/jpeg', 'image/png', 'image/webp'],
    logos: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    events: ['image/jpeg', 'image/png', 'image/webp'],
  }

  const maxSizes = { cvs: 5 * 1024 * 1024, photos: 2 * 1024 * 1024, logos: 2 * 1024 * 1024, events: 3 * 1024 * 1024 }

  const mime = file.type.toLowerCase()
  const okType = (allowed[bucket] ?? []).includes(mime)
  const okSize = file.size <= (maxSizes[bucket] ?? 0)
  const hasExecutableExt = /\.(exe|bat|sh|js|php|pl|cgi|dll|app)$/i.test(file.name)
  const doubleExt = /\.[^.]+\.(exe|bat|sh|js|php|pl|cgi|dll|app)$/i.test(file.name)

  const ok = okType && okSize && !hasExecutableExt && !doubleExt

  return Response.json({ ok, okType, okSize, hasExecutableExt, doubleExt })
})