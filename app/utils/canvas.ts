import { DrawCommand, CanvasConfig, GameCell } from "../types";

/**
 * 生成游戏手柄图标路径
 */
export const gamepadIconPath = (x: number, y: number, size: number): DrawCommand[] => {
  return [
    // 主体
    { cmd: "beginPath" },
    { cmd: "roundRect", args: [x, y + size * 0.3, size, size * 0.4, size * 0.2] },
    { cmd: "fill" },

    // 左侧圆形
    { cmd: "beginPath" },
    { cmd: "arc", args: [x + size * 0.25, y + size * 0.5, size * 0.25, 0, Math.PI * 2] },
    { cmd: "fill" },

    // 右侧圆形
    { cmd: "beginPath" },
    { cmd: "arc", args: [x + size * 0.75, y + size * 0.5, size * 0.25, 0, Math.PI * 2] },
    { cmd: "fill" },

    // 十字键
    { cmd: "beginPath" },
    { cmd: "roundRect", args: [x + size * 0.15, y + size * 0.4, size * 0.2, size * 0.2, size * 0.05] },
    { cmd: "fill" },

    // 按钮
    { cmd: "beginPath" },
    { cmd: "arc", args: [x + size * 0.7, y + size * 0.4, size * 0.08, 0, Math.PI * 2] },
    { cmd: "fill" },
    { cmd: "beginPath" },
    { cmd: "arc", args: [x + size * 0.85, y + size * 0.4, size * 0.08, 0, Math.PI * 2] },
    { cmd: "fill" },
  ];
};

/**
 * 获取点击的单元格ID
 */
export function getCellIdFromCoordinates(
  x: number,
  y: number,
  config: CanvasConfig
): number | null {
  // 计算网格区域
  const gridTop = config.padding + config.titleHeight;
  const gridWidth = config.width - config.padding * 2;
  const gridHeight = config.height - gridTop - config.padding;

  // 计算单元格尺寸
  const cellWidth = gridWidth / config.gridCols;
  const cellHeight = gridHeight / config.gridRows;

  // 检查点击的是哪个单元格
  if (
    x >= config.padding &&
    x <= config.width - config.padding &&
    y >= gridTop &&
    y <= gridTop + gridHeight
  ) {
    const col = Math.floor((x - config.padding) / cellWidth);
    const row = Math.floor((y - gridTop) / cellHeight);

    if (col >= 0 && col < config.gridCols && row >= 0 && row < config.gridRows) {
      return row * config.gridCols + col;
    }
  }

  return null;
}
