"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { GameCell, GameSearchResult } from "../types"
import { CANVAS_CONFIG, isBrowser } from "../constants"
import { gamepadIconPath, getCellIdFromCoordinates } from "../utils/canvas"
import { saveToIndexedDB } from "../utils/indexedDB"
import { GameSearchDialog } from "./GameSearchDialog"

interface GameGridProps {
  initialCells: GameCell[]
  onUpdateCells: (cells: GameCell[]) => void
}

export function GameGrid({ initialCells, onUpdateCells }: GameGridProps) {
  // Canvas相关状态
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [canvasLoaded, setCanvasLoaded] = useState(false)
  const [dragOverCellId, setDragOverCellId] = useState<number | null>(null)
  const [cells, setCells] = useState<GameCell[]>(initialCells)
  
  // 搜索状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCellId, setSelectedCellId] = useState<number | null>(null)
  
  // 当cells状态发生变化时，通知父组件
  useEffect(() => {
    onUpdateCells(cells)
  }, [cells, onUpdateCells])
  
  // 计算Canvas缩放比例
  useEffect(() => {
    if (!isBrowser || !canvasRef.current) return;

    const updateScale = () => {
      if (!canvasRef.current) return;

      const containerWidth = Math.min(window.innerWidth - 40, 1200);
      const newScale = containerWidth / CANVAS_CONFIG.width;
      setScale(newScale);

      // 更新Canvas尺寸
      const canvas = canvasRef.current;
      canvas.style.width = `${CANVAS_CONFIG.width * newScale}px`;
      canvas.style.height = `${CANVAS_CONFIG.height * newScale}px`;

      // 保持Canvas的实际像素数
      canvas.width = CANVAS_CONFIG.width;
      canvas.height = CANVAS_CONFIG.height;

      // 重新绘制
      drawCanvas();
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    setCanvasLoaded(true);

    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // 当cells变化时重新绘制Canvas
  useEffect(() => {
    if (canvasLoaded && isBrowser) {
      drawCanvas();
    }
  }, [cells, canvasLoaded, dragOverCellId])

  // 加载图片
  useEffect(() => {
    if (!isBrowser) return;

    cells.forEach((cell, index) => {
      if (cell.image && !cell.imageObj) {
        try {
          // 使用全局 window.Image 构造函数而不是直接使用 Image
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onerror = (err) => {
            console.error(`图片加载失败: ${cell.image}`, err);
          };
          img.onload = () => {
            setCells((prev) => {
              const newCells = [...prev];
              newCells[index] = { ...newCells[index], imageObj: img };
              return newCells;
            });
          };
          img.src = cell.image;
        } catch (error) {
          console.error("创建图片对象失败:", error);
        }
      }
    });
  }, [cells]);

  // 绘制Canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    try {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制白色背景
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制标题
      ctx.fillStyle = "black"
      ctx.font = `bold ${CANVAS_CONFIG.titleFontSize}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText("游戏生涯个人喜好表", canvas.width / 2, CANVAS_CONFIG.padding + CANVAS_CONFIG.titleFontSize / 2)

      // 计算网格区域
      const gridTop = CANVAS_CONFIG.padding + CANVAS_CONFIG.titleHeight
      const gridWidth = canvas.width - CANVAS_CONFIG.padding * 2
      const gridHeight = canvas.height - gridTop - CANVAS_CONFIG.padding

      // 计算单元格尺寸
      const cellWidth = gridWidth / CANVAS_CONFIG.gridCols
      const cellHeight = gridHeight / CANVAS_CONFIG.gridRows

      // 绘制单元格
      cells.forEach((cell, index) => {
        const row = Math.floor(index / CANVAS_CONFIG.gridCols)
        const col = index % CANVAS_CONFIG.gridCols

        const x = CANVAS_CONFIG.padding + col * cellWidth
        const y = gridTop + row * cellHeight

        // 绘制单元格边框
        ctx.strokeStyle = "black"
        ctx.lineWidth = CANVAS_CONFIG.cellBorderWidth

        // 如果是拖拽目标，绘制高亮边框
        if (dragOverCellId === cell.id) {
          ctx.strokeStyle = "#3b82f6" // 蓝色高亮
          ctx.lineWidth = CANVAS_CONFIG.cellBorderWidth * 2
        }

        // 检查是否支持 roundRect API
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(
            x + CANVAS_CONFIG.cellPadding / 2,
            y + CANVAS_CONFIG.cellPadding / 2,
            cellWidth - CANVAS_CONFIG.cellPadding,
            cellHeight - CANVAS_CONFIG.cellPadding,
            CANVAS_CONFIG.cellBorderRadius
          );
          ctx.stroke();
        } else {
          // 对于不支持 roundRect 的浏览器，使用普通矩形
          ctx.strokeRect(
            x + CANVAS_CONFIG.cellPadding / 2,
            y + CANVAS_CONFIG.cellPadding / 2,
            cellWidth - CANVAS_CONFIG.cellPadding,
            cellHeight - CANVAS_CONFIG.cellPadding
          );
        }

        // 计算封面区域
        const coverWidth = cellWidth - CANVAS_CONFIG.cellPadding * 2 - CANVAS_CONFIG.cellBorderWidth * 2
        const coverHeight = coverWidth / CANVAS_CONFIG.coverRatio
        const coverX = x + CANVAS_CONFIG.cellPadding + CANVAS_CONFIG.cellBorderWidth
        const coverY = y + CANVAS_CONFIG.cellPadding + CANVAS_CONFIG.cellBorderWidth

        // 绘制封面区域
        if (cell.imageObj) {
          try {
            // 绘制游戏封面
            ctx.drawImage(cell.imageObj, coverX, coverY, coverWidth, coverHeight);
          } catch (error) {
            console.error(`绘制图片失败: ${cell.name || index}`, error);
            // 绘制错误占位图
            drawPlaceholder();
          }
        } else {
          // 绘制空白封面区域
          drawPlaceholder();
        }

        // 内部函数：绘制占位符
        function drawPlaceholder() {
          ctx.fillStyle = "#f3f4f6"; // 淡灰色背景
          ctx.fillRect(coverX, coverY, coverWidth, coverHeight);

          // 绘制游戏手柄图标
          const iconSize = Math.min(coverWidth, coverHeight) * 0.4;
          const iconX = coverX + (coverWidth - iconSize) / 2;
          const iconY = coverY + (coverHeight - iconSize) / 2;

          // 绘制游戏手柄图标
          ctx.fillStyle = "#9ca3af";
          gamepadIconPath(iconX, iconY, iconSize).forEach((cmd) => {
            if (cmd.cmd === "beginPath") {
              ctx.beginPath();
            } else if (cmd.cmd === "roundRect" && cmd.args && typeof ctx.roundRect === 'function') {
              ctx.roundRect(...cmd.args);
            } else if (cmd.cmd === "arc" && cmd.args) {
              ctx.arc(...cmd.args);
            } else if (cmd.cmd === "fill") {
              ctx.fill();
            }
          });
        }

        // 绘制标题文字
        ctx.fillStyle = "black"
        ctx.font = `${CANVAS_CONFIG.cellTitleFontSize}px sans-serif`
        ctx.textAlign = "center"
        ctx.fillText(
          cell.title,
          x + cellWidth / 2,
          coverY + coverHeight + CANVAS_CONFIG.cellTitleMargin + CANVAS_CONFIG.cellTitleFontSize,
        )

        // 如果有游戏名称，绘制游戏名称
        if (cell.name) {
          ctx.fillStyle = "#4b5563" // 灰色文字
          ctx.font = `${CANVAS_CONFIG.cellNameFontSize}px sans-serif`

          // 截断过长的游戏名称
          let gameName = cell.name
          let textWidth = ctx.measureText(gameName).width
          const maxWidth = cellWidth - CANVAS_CONFIG.cellPadding * 4

          if (textWidth > maxWidth) {
            // 截断文本并添加省略号
            let truncated = gameName
            while (textWidth > maxWidth && truncated.length > 0) {
              truncated = truncated.slice(0, -1)
              textWidth = ctx.measureText(truncated + "...").width
            }
            gameName = truncated + "..."
          }

          ctx.fillText(
            gameName,
            x + cellWidth / 2,
            coverY +
              coverHeight +
              CANVAS_CONFIG.cellTitleMargin +
              CANVAS_CONFIG.cellTitleFontSize +
              CANVAS_CONFIG.cellNameMargin +
              CANVAS_CONFIG.cellNameFontSize,
          )
        }
      })
    } catch (error) {
      console.error("绘制Canvas时发生错误:", error);
    }
  }

  // 处理Canvas点击事件
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 获取点击坐标（考虑缩放）
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    // 检查点击的是哪个单元格
    const cellId = getCellIdFromCoordinates(x, y, CANVAS_CONFIG)
    if (cellId !== null) {
      openSearchDialog(cellId)
    }
  }

  // 处理拖拽事件
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    if (!canvasRef.current) return

    // 获取拖拽坐标（考虑缩放）
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    // 获取拖拽经过的单元格
    const cellId = getCellIdFromCoordinates(x, y, CANVAS_CONFIG)

    // 更新拖拽经过的单元格ID
    setDragOverCellId(cellId)
  }

  const handleDragLeave = () => {
    setDragOverCellId(null)
  }

  const handleDrop = async (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    if (!canvasRef.current) return

    // 获取拖拽坐标（考虑缩放）
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    // 获取拖拽放置的单元格
    const cellId = getCellIdFromCoordinates(x, y, CANVAS_CONFIG)

    // 清除拖拽状态
    setDragOverCellId(null)

    if (cellId === null) return

    // 处理拖拽的文件
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]

      // 检查是否是图片文件
      if (!file.type.startsWith("image/")) {
        toast({
          title: "错误",
          description: "只能拖拽图片文件",
          variant: "destructive",
        })
        return
      }

      try {
        // 读取图片文件
        const imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // 更新单元格数据
        const updatedCell: GameCell = {
          ...cells[cellId],
          image: imageUrl,
          name: file.name.replace(/\.[^/.]+$/, ""), // 移除文件扩展名作为游戏名称
        }

        // 更新状态
        setCells((prev) => {
          const newCells = [...prev]
          newCells[cellId] = updatedCell
          return newCells
        })

        // 保存到IndexedDB
        saveToIndexedDB(updatedCell)

        toast({
          title: "成功",
          description: "图片已添加到格子中",
        })
      } catch (error) {
        console.error("读取图片失败:", error)
        toast({
          title: "错误",
          description: "读取图片失败",
          variant: "destructive",
        })
      }
    }
  }

  // 打开搜索对话框
  const openSearchDialog = (cellId: number) => {
    setSelectedCellId(cellId)
    setIsDialogOpen(true)
  }

  // 选择游戏
  const handleSelectGame = (game: GameSearchResult) => {
    if (selectedCellId === null) return

    const updatedCell: GameCell = {
      ...cells[selectedCellId],
      image: game.image,
      name: game.name,
      imageObj: null,
    }

    setCells(cells.map((cell) => (cell.id === selectedCellId ? updatedCell : cell)))

    // 保存到IndexedDB
    saveToIndexedDB(updatedCell)

    setIsDialogOpen(false)
  }

  // 生成图片
  const generateImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // 在某些浏览器中，如果内容包含跨域资源且未正确设置 CORS，
      // 调用 toDataURL 会抛出安全错误。使用 try-catch 处理。
      const dataUrl = canvas.toDataURL("image/png")

      // 创建下载链接
      const link = document.createElement("a")
      link.download = "游戏生涯个人喜好表.png"
      link.href = dataUrl
      link.click()

      toast({
        title: "成功",
        description: "图片已生成并下载",
      })
    } catch (error) {
      console.error("生成图片失败:", error)
      toast({
        title: "错误",
        description: "生成图片失败，可能是由于图片包含跨域资源。",
        variant: "destructive",
      })
    }
  }

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

      <p className="mt-4 text-sm text-gray-500">提示: 您可以直接从桌面拖拽图片到格子中</p>

      <Button onClick={generateImage} className="mt-6 px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700">
        生成游戏生涯个人喜好表!
      </Button>

      {/* 游戏搜索对话框 */}
      <GameSearchDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSelectGame={handleSelectGame}
      />
    </>
  )
}
