"use client"

import { useState, useEffect } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { GameGrid } from "./components/GameGrid"
import { GameCell } from "./types"
import { CELL_TITLES } from "./constants"
import { loadCellsFromDB } from "./utils/indexedDB"

export default function Home() {
  // 初始化游戏格子数据
  const [cells, setCells] = useState<GameCell[]>(
    CELL_TITLES.map((title, index) => ({
      id: index,
      title,
      image: undefined,
      name: undefined,
      imageObj: null,
    }))
  )
  
  const [loading, setLoading] = useState(true)

  // 从IndexedDB加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCells = await loadCellsFromDB()
        
        if (savedCells && savedCells.length > 0) {
          // 合并保存的数据和初始数据
          setCells(prevCells => {
            const newCells = [...prevCells]
            savedCells.forEach((savedCell) => {
              const index = newCells.findIndex((cell) => cell.id === savedCell.id)
              if (index !== -1) {
                newCells[index] = { ...newCells[index], ...savedCell }
              }
            })
            return newCells
          })
        }
      } catch (error) {
        console.error("加载数据失败:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 更新单元格数据的处理函数
  const handleUpdateCells = (newCells: GameCell[]) => {
    setCells(newCells)
  }

  return (
    <ToastProvider>
      <main className="min-h-screen flex flex-col items-center py-8 px-4 relative">
        {/* GitHub 角标 */}
        <a 
          href="https://github.com/SomiaWhiteRing/gamegrid" 
          className="github-corner absolute top-0 left-0 z-50"
          aria-label="在GitHub上查看源码"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="80" height="80" viewBox="0 0 250 250" style={{ 
            fill: '#151513', 
            color: '#fff', 
            position: 'absolute', 
            top: 0, 
            border: 0, 
            left: 0, 
            transform: 'scale(-1, 1)' 
          }} aria-hidden="true">
            <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
            <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{ transformOrigin: '130px 106px' }} className="octo-arm"></path>
            <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path>
          </svg>
        </a>
        
        {!loading && (
          <GameGrid 
            initialCells={cells} 
            onUpdateCells={handleUpdateCells} 
          />
        )}
        
        <div className="text-sm text-gray-500 mt-1 text-center">
          <p>
            <a className="text-blue-500" href="https://weibo.com/6571509464">苍旻白轮</a> made with Copilot
          </p>
          <p>Powered by SteamGridDB</p>
        </div>
      </main>
    </ToastProvider>
  )
}

