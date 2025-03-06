"use client"

import { useState } from "react"
import NextImage from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Gamepad2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { GameCell, GameSearchResult } from "../types"

interface GameSearchDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSelectGame: (game: GameSearchResult) => void
}

/**
 * 游戏搜索对话框组件
 */
export function GameSearchDialog({ isOpen, onOpenChange, onSelectGame }: GameSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchStatus, setSearchStatus] = useState("")

  // 搜索游戏 - 使用流式响应
  const searchGames = async () => {
    if (!searchTerm.trim()) return

    setIsLoading(true)
    setSearchResults([])
    setSearchStatus("正在搜索...")

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("响应没有数据")
      }

      // 创建一个读取器来处理流数据
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // 临时保存结果的数组
      let games: GameSearchResult[] = []
      const receivedGames = new Map<number, GameSearchResult>()

      let done = false
      let buffer = ""

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          buffer += decoder.decode(value, { stream: true })

          // 处理缓冲区中的完整消息
          const lines = buffer.split('\n')
          // 保留最后一个可能不完整的行
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const data = JSON.parse(line)

              switch (data.type) {
                case "init":
                  setSearchStatus(`找到 ${data.total} 个结果，正在加载封面...`)
                  break

                case "gameStart":
                  // 游戏开始加载，添加到结果中（无图片）
                  receivedGames.set(data.game.id, data.game)
                  games = Array.from(receivedGames.values())
                  setSearchResults([...games])
                  break

                case "gameComplete":
                  // 游戏加载完成（有图片），更新结果
                  receivedGames.set(data.game.id, data.game)
                  games = Array.from(receivedGames.values())
                  setSearchResults([...games])
                  break

                case "gameError":
                  console.error(`游戏 ${data.gameId} 加载失败:`, data.error)
                  break

                case "error":
                  toast({
                    title: "搜索出错",
                    description: data.message,
                    variant: "destructive",
                  })
                  setSearchStatus("搜索失败")
                  break

                case "end":
                  setSearchStatus(games.length > 0 ? "" : "未找到相关游戏")
                  break
              }
            } catch (error) {
              console.error("解析响应数据失败:", error, line)
            }
          }
        }
      }

    } catch (error) {
      console.error("搜索游戏失败:", error)
      toast({
        title: "搜索失败",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? (error as Error).message 
          : "无法获取游戏数据",
        variant: "destructive",
      })
      setSearchStatus("搜索失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>搜索游戏</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="输入游戏名称..."
            onKeyDown={(e) => e.key === "Enter" && searchGames()}
          />
          <Button onClick={searchGames} disabled={isLoading}>
            {isLoading ? "搜索中..." : "搜索"}
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {searchResults.map((game) => (
                <div
                  key={game.id}
                  onClick={() => onSelectGame(game)}
                  className="cursor-pointer border rounded p-2 hover:bg-gray-50"
                >
                  {game.image ? (
                    <div className="relative w-full h-0 pb-[133.33%] rounded overflow-hidden">
                      <NextImage src={game.image} alt={game.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-0 pb-[133.33%] bg-gray-100 relative rounded">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Gamepad2 className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  )}
                  <p className="text-sm truncate mt-2">{game.name}</p>
                </div>
              ))}
            </div>
          ) : searchStatus ? (
            <p className="text-center py-4 text-gray-500">{searchStatus}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
