import { supabase } from '../lib/supabase'

export function openCv(cv) {
  if (!cv?.file_path) throw new Error('No file attached to this CV.')
  return supabase.storage.from('uploads').createSignedUrl(cv.file_path, 60).then(({ data, error }) => {
    if (error) throw error
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  })
}