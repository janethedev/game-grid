import { NextResponse } from "next/server";

// 这里需要在Vercel上设置STEAMGRIDDB_API_KEY环境变量
const STEAMGRIDDB_API_KEY = process.env.STEAMGRIDDB_API_KEY;

// 自定义 fetch 函数，包含重试逻辑
async function fetchWithRetry(url: string, options: RequestInit, retries = 2, timeout = 8000, retryDelay = 1000) {
  // 使用 AbortController 控制请求超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries <= 0) throw error;

    console.log(`请求失败，${retries}次重试后再尝试...`);
    // 等待一段时间再重试
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    return fetchWithRetry(url, options, retries - 1, timeout, retryDelay);
  }
}

// 为游戏列表请求定制的更积极的重试策略
async function fetchGameList(url: string, options: RequestInit) {
  // 游戏列表接口使用更积极的重试策略：更多重试次数(4次)，更短的超时(4秒)，更短的重试间隔(500ms)
  return fetchWithRetry(url, options, 4, 4000, 500);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "搜索词不能为空" }, { status: 400 });
  }

  // 使用 ReadableStream 创建流式响应
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log(`开始搜索游戏: "${query}", API密钥是否存在: ${!!STEAMGRIDDB_API_KEY}`);

        // 搜索游戏 - 使用专用的游戏列表获取函数
        const searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`;
        console.log(`发送搜索请求到: ${searchUrl}`);

        const searchResponse = await fetchGameList(
          searchUrl,
          {
            headers: {
              Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
            },
          }
        );

        console.log(`搜索响应状态: ${searchResponse.status}`);

        if (!searchResponse.ok) {
          throw new Error(`SteamGridDB API 错误: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        console.log(`搜索结果数量: ${searchData.data ? searchData.data.length : 0}`);

        if (!searchData.data || searchData.data.length === 0) {
          console.log('没有找到搜索结果');
          controller.enqueue(new TextEncoder().encode(JSON.stringify({
            type: "end",
            message: "没有找到任何游戏"
          })));
          controller.close();
          return;
        }

        // 发送初始消息，告知前端总游戏数量
        controller.enqueue(new TextEncoder().encode(JSON.stringify({
          type: "init",
          total: Math.min(searchData.data.length, 10)
        }) + '\n'));

        // 处理前10个搜索结果
        for (const game of searchData.data.slice(0, 10)) {
          try {
            console.log(`处理游戏: ${game.id} (${game.name})`);

            // 先发送游戏的基本信息，不含图片
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              type: "gameStart",
              game: {
                id: game.id,
                name: game.name,
                image: null
              }
            }) + '\n'));

            // 获取游戏封面 - 尝试600x900尺寸（竖版）
            const gridUrl = `https://www.steamgriddb.com/api/v2/grids/game/${game.id}?dimensions=600x900&styles=alternate,blurred,material,white_logo&types=static&nsfw=false&humor=any&limit=10`;

            let image = null;

            try {
              // 封面获取使用标准重试策略
              const gridResponse = await fetchWithRetry(
                gridUrl,
                {
                  headers: {
                    Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
                  },
                },
                2, // 2次重试
                6000 // 6秒超时
              );

              if (gridResponse.ok) {
                const gridData = await gridResponse.json();

                if (gridData.data && gridData.data.length > 0) {
                  image = gridData.data[0].url;
                  console.log(`游戏 ${game.id} 找到600x900格式的图片`);
                } else {
                  console.log(`游戏 ${game.id} 没有600x900格式图片，尝试342x482格式...`);
                  // 如果没有600x900的图片，尝试获取342x482格式
                  const fallbackGridUrl = `https://www.steamgriddb.com/api/v2/grids/game/${game.id}?dimensions=342x482&styles=alternate,blurred,material,white_logo&types=static&nsfw=false&limit=10`;

                  try {
                    const fallbackResponse = await fetchWithRetry(fallbackGridUrl, {
                      headers: {
                        Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
                      },
                    }, 1, 5000);

                    if (fallbackResponse.ok) {
                      const fallbackData = await fallbackResponse.json();

                      if (fallbackData.data && fallbackData.data.length > 0) {
                        image = fallbackData.data[0].url;
                        console.log(`游戏 ${game.id} 找到342x482格式的图片`);
                      } else {
                        console.log(`游戏 ${game.id} 没有342x482格式图片，尝试任意尺寸...`);

                        // 如果两种尺寸都没有，尝试获取任意尺寸的封面
                        const anyFormatUrl = `https://www.steamgriddb.com/api/v2/grids/game/${game.id}?styles=alternate,blurred,material,white_logo&types=static&nsfw=false&limit=10`;

                        try {
                          const anyFormatResponse = await fetchWithRetry(anyFormatUrl, {
                            headers: {
                              Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
                            },
                          }, 1, 5000);

                          if (anyFormatResponse.ok) {
                            const anyFormatData = await anyFormatResponse.json();

                            if (anyFormatData.data && anyFormatData.data.length > 0) {
                              image = anyFormatData.data[0].url;
                              console.log(`游戏 ${game.id} 找到其他尺寸的图片`);
                            } else {
                              console.log(`游戏 ${game.id} 无法找到任何封面图片`);
                            }
                          }
                        } catch (anyFormatError) {
                          console.log(`获取任意尺寸封面失败:`, anyFormatError);
                        }
                      }
                    }
                  } catch (fallbackError) {
                    console.log(`获取备选封面失败:`, fallbackError);
                  }
                }
              }
            } catch (gridError) {
              console.log(`获取游戏 ${game.id} 封面失败:`, gridError);
            }

            // 发送游戏完整信息，含图片URL
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              type: "gameComplete",
              game: {
                id: game.id,
                name: game.name,
                image
              }
            }) + '\n'));

          } catch (error) {
            console.error(`处理游戏 ${game.id} 失败:`, error);

            // 发送失败信息
            controller.enqueue(new TextEncoder().encode(JSON.stringify({
              type: "gameError",
              gameId: game.id,
              error: "获取游戏信息失败"
            }) + '\n'));
          }
        }

        // 发送结束消息
        controller.enqueue(new TextEncoder().encode(JSON.stringify({
          type: "end",
          message: "所有游戏数据已发送完成"
        })));

        // 关闭流
        controller.close();
      } catch (error) {
        console.error("搜索游戏失败:", error);

        // 发送错误信息
        controller.enqueue(new TextEncoder().encode(JSON.stringify({
          type: "error",
          message: "搜索游戏失败，请稍后再试"
        })));

        // 关闭流
        controller.close();
      }
    }
  });

  // 返回流式响应
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

