const emptyCell = "\u00A0"

export default async function Card({title, items}) {
  return (
    <div className="p-2 bg-blue-100 rounded-lg">
      <div className="font-bold">
        {title}:
      </div>
      <div className="flex justify-between">
        <div>
          {items.map((item, index) => (
            <div key={index} className="">
              {
                // Label is the key followed by : character
                Object.keys(item)[0]
              }:
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-1">
          <div>
            {
              items.map((item, index) => {
                // if value is an array then content if first element of array, otherwise it is the value itself
                // For TPS the value itself may be undefined
                const valUnit = Object.values(item)[0]
                const val = Array.isArray(valUnit) ? valUnit[0] : valUnit ?? emptyCell
                return (
                  <div key={index} className="text-end font-mono">
                    {val}
                  </div>
                )
              })
            }
          </div>
          <div>
            {
              items.map((item, index) => {
                const valUnit = Object.values(item)[0]
                // if value is an array then unit is second element of array (in jsx format), otherwise there is no unit
                const unit = Array.isArray(valUnit) ? valUnit[1] : emptyCell
                return (
                  <div key={index} className="w-16 font-mono text-gray-400">
                    {unit}
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}
