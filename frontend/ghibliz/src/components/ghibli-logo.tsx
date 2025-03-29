import { Leaf } from "lucide-react"

export function GhibliLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
        <Leaf className="w-5 h-5 text-green-600" />
      </div>
      <span className="text-2xl font-playfair font-semibold text-gray-800">Ghibliz</span>
    </div>
  )
}