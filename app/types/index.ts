/**
 * 游戏格子类型定义
 */
export interface GameCell {
  id: number
  title: string
  image: string | null
  name: string | null
  imageObj?: HTMLImageElement | null
}

/**
 * Canvas绘图命令类型
 */
export interface DrawCommand {
  cmd: string;
  args?: any[];
}

/**
 * Canvas配置类型
 */
export interface CanvasConfig {
  width: number;
  height: number;
  padding: number;
  titleHeight: number;
  gridRows: number;
  gridCols: number;
  cellPadding: number;
  cellBorderWidth: number;
  cellBorderRadius: number;
  cellAspectRatio: number;
  coverRatio: number;
  titleFontSize: number;
  cellTitleFontSize: number;
  cellNameFontSize: number;
  cellTitleMargin: number;
  cellNameMargin: number;
}

/**
 * 搜索游戏结果项
 */
export interface GameSearchResult {
  id: number;
  name: string;
  image: string | null;
}

/**
 * IndexedDB配置
 */
export interface DBConfig {
  name: string;
  storeName: string;
  version: number;
}
