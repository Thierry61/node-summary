const emptyCell = "\u00A0"

export default async function Card({title, items}) {
  return (
    <div className="px-2 py-1 bg-blue-100 rounded-lg">
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
              // Emit single value or first value + first unit + second value (the last unit is emitted in a separate column)
              items.map((item, index) => {
                // Get last value with its modified flag
                const values = Object.values(item)[0]
                const valUnit2 = values.slice(-1)[0]
                const val2 = valUnit2[0] ?? emptyCell
                const emphasize2 = valUnit2[2]
                // Emit single value
                if (values.length == 1) {
                  return (
                    <div key={index} className={`text-end font-mono${emphasize2 ? " animate-update" : ""}`} >
                      {val2}
                    </div>
                  )
                }
                // Get first value with its unit and modified flag
                const valUnit1 = values[0]
                const val1 = valUnit1[0] ?? emptyCell
                const unit1 = valUnit1[1]
                const emphasize1 = valUnit1[2]
                // Emit first value + first unit + second value
                return (
                  <div key="{index}" className='flex justify-end gap-1'>
                    <div key="1" className={`text-end font-mono${emphasize1 ? " animate-update" : ""}`} >
                      {val1}
                    </div>
                    <div key="2" className="text-gray-400">
                      {unit1}
                    </div>
                    <div key="3" className={`text-end font-mono${emphasize2 ? " animate-update" : ""}`} >
                      {val2}
                    </div>
                  </div>
                )
            })
            }
          </div>
          <div>
            {
              // Unit of last element is special because it is aligned on a column
              items.map((item, index) => {
                const values = Object.values(item)[0]
                const valUnit2 = values.slice(-1)[0]
                // Unit is a string, a jsx data (with superscript for epoch) or undefined (changed to empty cell)
                const unit2 = valUnit2[1] ?? emptyCell
                return (
                  <div key={index} className="w-14 text-gray-400">
                    {unit2}
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
