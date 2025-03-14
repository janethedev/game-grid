"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GameCell, GameSearchResult, GlobalConfig } from "../types"
import { saveToIndexedDB } from "../utils/indexedDB"
import { GameSearchDialog } from "./GameSearchDialog"
import { TextEditDialog } from "./TextEditDialog"
import { useCanvasRenderer } from "../hooks/useCanvasRenderer"
import { useCanvasEvents } from "../hooks/useCanvasEvents"

interface GameGridProps {
  initialCells: GameCell[]
  onUpdateCells: (cells: GameCell[]) => void
}

export function GameGrid({ initialCells, onUpdateCells }: GameGridProps) {
  // Canvas相关状态
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cells, setCells] = useState<GameCell[]>(initialCells)
  
  // 全局配置状态
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    mainTitle: "游戏生涯个人喜好表"
  })
  
  // 搜索与编辑状态
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false)
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [isMainTitleDialogOpen, setIsMainTitleDialogOpen] = useState(false)
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState("")
  
  // 当cells状态发生变化时，通知父组件
  useEffect(() => {
    onUpdateCells(cells)
  }, [cells, onUpdateCells])

  // 打开搜索对话框
  const openSearchDialog = (cellId: number) => {
    console.log("openSearchDialog")
    setSelectedCellId(cellId);
    setIsSearchDialogOpen(true);
  };

  // 打开标题编辑对话框
  const openTitleEditDialog = (cellId: number) => {
    setSelectedCellId(cellId);
    setEditingText(cells[cellId].title);
    setIsTitleDialogOpen(true);
  };

  // 打开游戏名称编辑对话框
  const openNameEditDialog = (cellId: number) => {
    setSelectedCellId(cellId);
    setEditingText(cells[cellId].name || "");
    setIsNameDialogOpen(true);
  };

  // 打开主标题编辑对话框
  const openMainTitleEditDialog = () => {
    setEditingText(globalConfig.mainTitle);
    setIsMainTitleDialogOpen(true);
  };

  // 使用自定义hooks处理Canvas渲染
  const { scale, drawCanvas } = useCanvasRenderer({ 
    canvasRef, 
    cells, 
    setCells, 
    dragOverCellId: null,
    globalConfig
  });

  // 使用自定义hooks管理Canvas渲染
  const { 
    dragOverCellId: currentDragOverCellId, 
    handleCanvasClick, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    generateImage 
  } = useCanvasEvents({
    cells,
    setCells,
    scale,
    openSearchDialog,
    openTitleEditDialog,
    openNameEditDialog,
    openMainTitleEditDialog,
    forceCanvasRedraw: drawCanvas,
  });

  // 更新 useCanvasRenderer 以使用当前的 dragOverCellId
  useEffect(() => {
    if (drawCanvas) {
      drawCanvas();
    }
  }, [currentDragOverCellId, drawCanvas]);

  // 保存标题更改
  const handleSaveTitle = (newText: string) => {
    if (selectedCellId === null) return;

    const updatedCell: GameCell = {
      ...cells[selectedCellId],
      title: newText,
    };

    setCells(cells.map((cell) => (cell.id === selectedCellId ? updatedCell : cell)));
    saveToIndexedDB(updatedCell);
    setIsTitleDialogOpen(false);
  };

  // 保存游戏名称更改
  const handleSaveName = (newText: string) => {
    if (selectedCellId === null) return;

    const updatedCell: GameCell = {
      ...cells[selectedCellId],
      name: newText,
    };

    setCells(cells.map((cell) => (cell.id === selectedCellId ? updatedCell : cell)));
    saveToIndexedDB(updatedCell);
    setIsNameDialogOpen(false);
  };

  // 保存主标题更改
  const handleSaveMainTitle = (newText: string) => {
    const updatedConfig = {
      ...globalConfig,
      mainTitle: newText
    };
    
    setGlobalConfig(updatedConfig);
    setIsMainTitleDialogOpen(false);
    
    // 保存到localStorage
    localStorage.setItem('gameGridGlobalConfig', JSON.stringify(updatedConfig));
    
    // 强制重绘画布
    setTimeout(() => {
      if (drawCanvas) {
        drawCanvas();
      }
    }, 0);
    
    // 更新页面标题
    if (typeof document !== 'undefined') {
      document.title = newText;
    }
  };

  // 加载全局配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('gameGridGlobalConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setGlobalConfig(parsedConfig);
        
        // 更新页面标题
        if (typeof document !== 'undefined' && parsedConfig.mainTitle) {
          document.title = parsedConfig.mainTitle;
        }
      } catch (error) {
        console.error("解析保存的全局配置失败:", error);
      }
    }
  }, []);

  // 选择游戏
  const handleSelectGame = async (game: GameSearchResult) => {
    if (selectedCellId === null) return;
    
    // 使用代理URL替换直接的外部URL
    const proxyImageUrl = `/api/proxy?url=${encodeURIComponent(game.image)}`;

    try {
      // 先更新UI显示，让用户知道正在处理
      const tempUpdatedCell: GameCell = {
        ...cells[selectedCellId],
        name: game.name,
        image: proxyImageUrl, // 临时使用代理URL
        imageObj: null,
      };
      
      setCells(cells.map((cell) => (cell.id === selectedCellId ? tempUpdatedCell : cell)));
      
      // 关闭搜索对话框，不挡着后续的UI操作
      setIsSearchDialogOpen(false);
      
      // 获取图片并转换为base64
      const response = await fetch(proxyImageUrl);
      const blob = await response.blob();
      
      // 创建图片对象进行裁切
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // 创建canvas进行裁切
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取canvas上下文');
      
      // 计算裁切尺寸
      const targetRatio = 3/4;
      const imgRatio = img.width / img.height;
      let cropWidth = img.width;
      let cropHeight = img.height;
      let cropX = 0;
      let cropY = 0;
      
      if (imgRatio > targetRatio) {
        // 图片更宽，需要裁切宽度
        cropWidth = img.height * targetRatio;
        cropX = (img.width - cropWidth) / 2;
      } else {
        // 图片更高，需要裁切高度
        cropHeight = img.width / targetRatio;
        cropY = (img.height - cropHeight) / 2;
      }
      
      // 设置canvas尺寸为裁切后的尺寸
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // 执行裁切
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      // 将裁切后的图片转换为base64
      const base64Url = canvas.toDataURL('image/jpeg', 0.9);
      
      // 清理资源
      URL.revokeObjectURL(img.src);
      
      // 使用base64格式的URL更新cell
      const finalUpdatedCell: GameCell = {
        ...cells[selectedCellId],
        image: base64Url,
        name: game.name,
        imageObj: null,
      };
      
      setCells(cells.map((cell) => (cell.id === selectedCellId ? finalUpdatedCell : cell)));
      
      // 保存到IndexedDB
      saveToIndexedDB(finalUpdatedCell);
    } catch (error) {
      console.error("转换图片为base64时出错:", error);
      // 如果转换失败，使用原始代理URL作为fallback
      const fallbackCell: GameCell = {
        ...cells[selectedCellId],
        image: proxyImageUrl,
        name: game.name,
        imageObj: null,
      };
      
      setCells(cells.map((cell) => (cell.id === selectedCellId ? fallbackCell : cell)));
      saveToIndexedDB(fallbackCell);
    }
  };

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    if (selectedCellId === null) return;

    try {
      // 创建图片对象进行裁切
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // 创建canvas进行裁切
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取canvas上下文');
      
      // 计算裁切尺寸
      const targetRatio = 3/4;
      const imgRatio = img.width / img.height;
      let cropWidth = img.width;
      let cropHeight = img.height;
      let cropX = 0;
      let cropY = 0;

      if (imgRatio > targetRatio) {
        // 图片更宽，需要裁切宽度
        cropWidth = img.height * targetRatio;
        cropX = (img.width - cropWidth) / 2;
      } else {
        // 图片更高，需要裁切高度
        cropHeight = img.width / targetRatio;
        cropY = (img.height - cropHeight) / 2;
      }

      // 设置canvas尺寸为目标尺寸
      canvas.width = 300; // 固定宽度
      canvas.height = 400; // 固定高度

      // 绘制裁切后的图片
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

      // 转换为base64
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);

      // 更新单元格
      const updatedCell: GameCell = {
        ...cells[selectedCellId],
        image: base64Image,
        imageObj: null,
      };

      setCells(cells.map((cell) => (cell.id === selectedCellId ? updatedCell : cell)));
      saveToIndexedDB(updatedCell);

      // 清理URL对象
      URL.revokeObjectURL(img.src);

      // 关闭搜索对话框
      setIsSearchDialogOpen(false);
    } catch (error) {
      console.error('处理上传图片失败:', error);
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="cursor-pointer"
        style={{
          width: `${CANVAS_CONFIG.width * scale}px`,
          height: `${CANVAS_CONFIG.height * scale}px`,
          maxWidth: "100%",
        }}
      />

      <p className="mt-4 px-4 text-sm text-gray-500">
        提示：点击顶部标题、格子标题或游戏名称可以编辑文字，另外可以直接从桌面拖拽图片到格子中。
      </p>

      <Button 
        onClick={() => generateImage(canvasRef)} 
        className="mt-6 px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
      >
        生成{globalConfig.mainTitle}!
      </Button>

      {/* 游戏搜索对话框 */}
      <GameSearchDialog 
        isOpen={isSearchDialogOpen} 
        onOpenChange={setIsSearchDialogOpen} 
        onSelectGame={handleSelectGame}
        onUploadImage={handleImageUpload}
      />
      
      {/* 标题编辑对话框 */}
      <TextEditDialog
        isOpen={isTitleDialogOpen}
        onOpenChange={setIsTitleDialogOpen}
        title="编辑标题"
        defaultValue={editingText}
        onSave={handleSaveTitle}
      />
      
      {/* 游戏名称编辑对话框 */}
      <TextEditDialog
        isOpen={isNameDialogOpen}
        onOpenChange={setIsNameDialogOpen}
        title="编辑游戏名称"
        defaultValue={editingText}
        onSave={handleSaveName}
      />

      {/* 主标题编辑对话框 */}
      <TextEditDialog
        isOpen={isMainTitleDialogOpen}
        onOpenChange={setIsMainTitleDialogOpen}
        title="编辑主标题"
        defaultValue={editingText}
        onSave={handleSaveMainTitle}
      />
    </>
  )
}

// 由于循环依赖问题，从常量文件导入CANVAS_CONFIG
import { CANVAS_CONFIG } from "../constants";
