import { useState, type DragEvent, type Ref } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'
import { cn } from 'cn'

const formatoTamano = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

function formatearTamano(bytes: number) {
  const kilobytes = bytes / 1024
  return kilobytes < 1024
    ? `${formatoTamano.format(kilobytes)} KB`
    : `${formatoTamano.format(kilobytes / 1024)} MB`
}

type ZonaArchivoCsvProps = {
  id: string
  name: string
  archivo: File | undefined
  invalido: boolean
  deshabilitado: boolean
  descritoPor: string
  inputRef: Ref<HTMLInputElement>
  onElegir: (archivo: File) => void
  onVariosArchivos: () => void
  onBlur: () => void
  className?: string
}

export function ZonaArchivoCsv({
  id,
  name,
  archivo,
  invalido,
  deshabilitado,
  descritoPor,
  inputRef,
  onElegir,
  onVariosArchivos,
  onBlur,
  className,
}: ZonaArchivoCsvProps) {
  const [arrastrando, setArrastrando] = useState(false)

  function arrastrarEncima(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault()
    if (!deshabilitado) setArrastrando(true)
  }

  function salir(evento: DragEvent<HTMLLabelElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
      setArrastrando(false)
    }
  }

  function soltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault()
    setArrastrando(false)
    if (deshabilitado) return
    const archivos = evento.dataTransfer.files
    if (archivos.length > 1) {
      onVariosArchivos()
      return
    }
    if (archivos[0]) onElegir(archivos[0])
  }

  return (
    <label
      htmlFor={id}
      data-arrastrando={arrastrando}
      data-invalido={invalido}
      data-deshabilitado={deshabilitado}
      onDragEnter={arrastrarEncima}
      onDragOver={arrastrarEncima}
      onDragLeave={salir}
      onDrop={soltar}
      className={cn(
        'relative flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-4 text-center transition-colors hover:bg-accent data-[arrastrando=true]:border-primary data-[arrastrando=true]:bg-accent data-[deshabilitado=true]:pointer-events-none data-[deshabilitado=true]:opacity-50 data-[invalido=true]:border-destructive motion-reduce:transition-none',
        className,
      )}
    >
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        disabled={deshabilitado}
        aria-invalid={invalido}
        aria-describedby={descritoPor}
        onBlur={onBlur}
        onChange={(evento) => {
          const elegido = evento.target.files?.[0]
          if (elegido) onElegir(elegido)
          evento.target.value = ''
        }}
      />
      {archivo ? (
        <>
          <FileSpreadsheet
            aria-hidden="true"
            className="size-5 text-foreground"
          />
          <span className="w-full truncate text-sm font-medium text-foreground">
            {archivo.name}
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatearTamano(archivo.size)}
            </span>{' '}
            · Haz clic o suelta otro para cambiarlo
          </span>
        </>
      ) : (
        <>
          <Upload aria-hidden="true" className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Arrastra el archivo aquí
          </span>
          <span className="text-xs text-muted-foreground">
            o haz clic para buscarlo en tu PC
          </span>
        </>
      )}
    </label>
  )
}
