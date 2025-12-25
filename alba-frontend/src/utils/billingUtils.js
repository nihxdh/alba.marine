export function getTotalBoxesFromMeatDetails(meatDetails = []) {
  return meatDetails.reduce(
    (total, item) => total + parseInt(item.noOfBox || 0, 10),
    0
  )
}

export function getTotalWeightFromMeatDetails(meatDetails = []) {
  return meatDetails.reduce(
    (total, item) => total + parseFloat(item.totalWeight || 0),
    0
  )
}

export function getGrandTotalsFromWeights(meatDetails = []) {
  let grandTotalKgs = 0
  let grandTotalBoxes = 0

  meatDetails.forEach((meat) => {
    ;(meat.weight || []).forEach((w) => {
      grandTotalKgs += parseFloat(w.kgs || 0)
    })
    grandTotalBoxes += parseInt(meat.noOfBox || 0, 10)
  })

  return { grandTotalKgs, grandTotalBoxes }
}

export function formatPeelingDate(dateString) {
  const date = new Date(dateString)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function getStatementNumberFromBillNo(billNo) {
  const match = String(billNo || '').match(/(\d+)$/)
  return match ? match[1] : '500'
}


