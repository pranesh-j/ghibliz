export function GhibliLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <div className="bg-amber-100 rounded-full p-0.5 flex items-center justify-center overflow-hidden border border-amber-200">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src="/ghiblit.webp" 
              alt="Ghiblit" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <span className="text-2xl font-playfair font-semibold text-[#3D2911] ml-2">Ghiblit</span>
      </div>
    </div>
  )
}