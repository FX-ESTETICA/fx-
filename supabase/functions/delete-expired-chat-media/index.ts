import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 查找所有超过 24 小时的消息
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // 我们提取所有包含媒体的文件。因为不确定数据库里具体有哪些列，我们直接查询这些常见的。
    // 如果没有 video_url 这个字段，这会导致报错，所以为了安全起见，只查询确定的 audio_url 和 image_url，并处理 file_url 等。
    // 之前纯 SQL 脚本里我们查了 id, audio_url, image_url
    const { data: expiredMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, audio_url, image_url')
      .lt('created_at', twentyFourHoursAgo);

    if (fetchError) throw fetchError;
    if (!expiredMessages || expiredMessages.length === 0) {
      return new Response(JSON.stringify({ message: "No expired messages found." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. 提取需要删除的文件路径
    // 文件格式类似于: https://[project].supabase.co/storage/v1/object/public/chat_media/[userId]/[fileName]
    const filePaths: string[] = [];
    
    expiredMessages.forEach(msg => {
      const urls = [msg.audio_url, msg.image_url].filter(Boolean) as string[];
      urls.forEach(url => {
        const urlParts = url.split('/chat_media/');
        if (urlParts.length > 1) {
          // urlParts[1] 就是真实的文件路径，比如 userId/fileName.mp3
          filePaths.push(urlParts[1]);
        }
      });
    });

    // 去重，以防万一
    const uniqueFilePaths = [...new Set(filePaths)];

    // 3. 调用 Storage API 合法删除物理文件 (批量删除)
    if (uniqueFilePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('chat_media')
        .remove(uniqueFilePaths);
        
      if (storageError) {
        console.error("Storage deletion failed:", storageError);
        // 即使部分删除失败，继续执行，不阻塞，因为可能是文件已被手动删除
      }
    }

    // 4. 删除数据库中的消息记录 (物理删除)
    const messageIds = expiredMessages.map(msg => msg.id);
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .in('id', messageIds);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ 
        message: "Successfully deleted expired chat messages and media files.",
        deletedFiles: uniqueFilePaths.length,
        deletedMessages: messageIds.length 
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
