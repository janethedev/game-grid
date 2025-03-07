import { NextResponse } from "next/server";

// 这里需要在Vercel上设置STEAMGRIDDB_API_KEY环境变量
const STEAMGRIDDB_API_KEY = process.env.STEAMGRIDDB_API_KEY;

// 保存最近一次预热的时间戳
let lastWarmupTime = 0;
// 预热状态
let isWarming = false;
// 预热冷却时间（5分钟）
const WARMUP_COOLDOWN = 5 * 60 * 1000;

// 执行预热API连接
async function warmupConnection() {
  if (!STEAMGRIDDB_API_KEY || isWarming) {
    return false;
  }

  // 检查是否需要预热（距离上次预热超过冷却时间）
  const now = Date.now();
  if (now - lastWarmupTime < WARMUP_COOLDOWN) {
    console.log("跳过预热：冷却时间未到");
    return true;
  }

  try {
    isWarming = true;
    console.log("开始预热API连接...");

    // 设置超时，确保预热不会永远挂起
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch("https://www.steamgriddb.com/api/v2/ping", {
      headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` },
      method: "HEAD",
      signal: controller.signal
    }).catch(e => {
      console.log("预热请求发生错误，这通常是正常的:", e.message);
    });

    clearTimeout(timeoutId);
    lastWarmupTime = now;
    console.log("API连接预热完成");
    return true;
  } catch (e) {
    console.error("预热API连接失败:", e);
    return false;
  } finally {
    isWarming = false;
  }
}

// 导出全局预热状态，供其他API路由使用
export const isApiWarmedUp = () => Date.now() - lastWarmupTime < WARMUP_COOLDOWN;

export async function GET() {
  const success = await warmupConnection();

  return NextResponse.json({
    success,
    warmedUp: isApiWarmedUp(),
    timestamp: lastWarmupTime
  });
}
