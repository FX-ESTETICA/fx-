import { createClient } from '@/utils/supabase/client'

/**
 * 媒体上传权限校验
 * 
 * 规则：
 * 1. 图片上传：所有登录用户均可。
 * 2. 视频上传：仅限会员等级 (member_level) >= 2 的优质会员或商家 (merchant)。
 */

export type MediaType = 'image' | 'video'

export async function canUploadMedia(type: MediaType): Promise<{ can: boolean; reason?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { can: false, reason: '请先登录' }
  }

  // 如果是商家，拥有所有权限
  const role = session.user.user_metadata?.role
  if (role === 'merchant') {
    return { can: true }
  }

  // 如果是普通用户，检查图片权限
  if (type === 'image') {
    return { can: true }
  }

  // 如果是视频，检查会员等级
  const { data: profile } = await supabase
    .from('profiles')
    .select('member_level')
    .eq('id', session.user.id)
    .single()

  const memberLevel = profile?.member_level || 0

  if (type === 'video' && memberLevel < 2) {
    return { 
      can: false, 
      reason: '视频上传功能仅对优质会员开放。请继续保持活跃以提升会员等级！' 
    }
  }

  return { can: true }
}
