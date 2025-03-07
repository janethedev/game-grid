"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GameCell, GameSearchResult } from "../types"
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
  
  // 搜索与编辑状态
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false)
  const [isTitleDialogOpen, setIsTitleDialogOpen] = useState(false)
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
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

  // 使用自定义hooks管理Canvas渲染
  const { dragOverCellId, handleCanvasClick, handleDragOver, handleDragLeave, handleDrop, generateImage } = 
    useCanvasEvents({
      cells,
      setCells,
      scale: useCanvasRenderer({ canvasRef, cells, setCells, dragOverCellId: null }).scale,
      openSearchDialog,
      openTitleEditDialog,
      openNameEditDialog,
    });

  // 使用自定义hooks处理Canvas渲染
  const { scale } = useCanvasRenderer({ 
    canvasRef, 
    cells, 
    setCells, 
    dragOverCellId 
  });

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

  // 选择游戏
  const handleSelectGame = (game: GameSearchResult) => {
    if (selectedCellId === null) return;

    const updatedCell: GameCell = {
      ...cells[selectedCellId],
      image: game.image,
      name: game.name,
      imageObj: null,
    };

    setCells(cells.map((cell) => (cell.id === selectedCellId ? updatedCell : cell)));

    // 保存到IndexedDB
    saveToIndexedDB(updatedCell);

    setIsSearchDialogOpen(false);
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

      <p className="mt-4 text-sm text-gray-500">
        提示：点击标题或游戏名称可以编辑文字，另外可以直接从桌面拖拽图片到格子中。
      </p>

      <Button 
        onClick={() => generateImage(canvasRef)} 
        className="mt-6 px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
      >
        生成游戏生涯个人喜好表!
      </Button>

      {/* 游戏搜索对话框 */}
      <GameSearchDialog 
        isOpen={isSearchDialogOpen} 
        onOpenChange={setIsSearchDialogOpen} 
        onSelectGame={handleSelectGame}
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
    </>
  )
}

// 由于循环依赖问题，从常量文件导入CANVAS_CONFIG
import { CANVAS_CONFIG } from "../constants";
