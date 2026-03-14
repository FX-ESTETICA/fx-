'use server'

import { MediaType } from '@/utils/media-permissions'
import { createClient } from '@/utils/supabase/server'

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY
const STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME || 'gx-plus-media'
const STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'de' // Default to Germany
const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY
const STREAM_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID

// Storage endpoint varies by region
const STORAGE_ENDPOINT = STORAGE_REGION === 'de' 
  ? 'storage.bunnycdn.com' 
  : `${STORAGE_REGION}.storage.bunnycdn.com`

/**
 * 上传图片到 Bunny Storage
 */
export async function uploadImageToBunny(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')
  if (!STORAGE_API_KEY) throw new Error('BUNNY_STORAGE_API_KEY is not configured')

  // 使用时间戳和随机数生成唯一文件名，防止重名覆盖
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  const fileName = `${timestamp}-${random}-${file.name}`
  const uploadUrl = `https://${STORAGE_ENDPOINT}/${STORAGE_ZONE_NAME}/${fileName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      AccessKey: STORAGE_API_KEY,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Bunny Storage upload failed: ${error}`)
  }

  // 返回 CDN 后的 URL
  return {
    url: fileName, // 这里返回相对路径，前端 getBunnyImageUrl 会处理成完整 CDN URL
    fullUrl: `${process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL}/${fileName}`
  }
}

/**
 * 上传视频到 Bunny Stream
 */
export async function uploadVideoToBunny(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')
  if (!STREAM_API_KEY || !STREAM_LIBRARY_ID) throw new Error('Bunny Stream is not configured')

  // 1. 创建视频条目获取 Video ID
  const createResponse = await fetch(`https://video.bunnycdn.com/library/${STREAM_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: STREAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: file.name }),
  })

  if (!createResponse.ok) {
    throw new Error('Failed to create video entry in Bunny Stream')
  }

  const { guid: videoId } = await createResponse.json()

  // 2. 上传视频内容
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const uploadResponse = await fetch(`https://video.bunnycdn.com/library/${STREAM_LIBRARY_ID}/videos/${videoId}`, {
    method: 'PUT',
    headers: {
      AccessKey: STREAM_API_KEY,
    },
    body: buffer,
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload video content to Bunny Stream')
  }

  return {
    videoId,
    libraryId: STREAM_LIBRARY_ID
  }
}

/**
 * 将上传成功的媒体信息存入 Supabase
 */
export async function savePostToDb(data: {
  type: MediaType
  media_url: string
  video_id?: string
  title?: string
  category?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    type: data.type,
    media_url: data.media_url,
    video_id: data.video_id,
    title: data.title || '新动态',
    category: data.category || '全部',
    tags: []
  })

  if (error) {
    console.error('Database save error:', error)
    throw new Error(`Failed to save post: ${error.message}`)
  }

  return { success: true }
}
