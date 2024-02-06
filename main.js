const masterOfPuppets = require('./masterOfPuppets')
const config = require('./config.json')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter 

async function main(){
    const url = config.URL
    const username = config.username
    const password = config.password
    const result = await masterOfPuppets(url, username, password)
    console.log(result)
    
    if (!result || result.length === 0) return false 
    await appendDataToTempCSV(result)
    return true
}

main()
const interval = 10 * 60 * 1000 //10 mins

function checkTime(){
    const startTime = 7
    const pauseTime = 20
    const hours = new Date().getHours()
    const minutes = new Date().getMinutes() > 9 ? new Date().getMinutes() : `0${new Date().getMinutes()}`
    console.log(`It is ${hours}:${minutes}. So...`)
    return hours >= startTime && hours < pauseTime
}

async function appendDataToTempCSV (data, path = './csv/users_list.csv'){

    const getCurrentDateTime = ()=> {
        const now = new Date()
        const localOffset = now.getTimezoneOffset()
        const localTime = new Date(now.getTime() - localOffset * 60000)
        const timeFormatted = localTime.toISOString().replace('T', " ").slice(0,19)
        return timeFormatted
    }

    const dataToAppend = data.map(obj => ({
        ... obj,
        dateTime: getCurrentDateTime()
    }))

    const csvWriter = createCsvWriter({
        path: path,
        header: [
          { id: 'username', title: 'Username' },
          { id: 'account_status', title: 'Account Status' },
          { id: 'employmentStatus', title: 'Employment Status' },
          { id: 'lastLogon_status', title: 'Last Logon' },
          { id: 'action', title: 'Action' },
          { id: 'dateTime', title: 'DateTime' }
        ],
        append: true
      })

      if (!fs.existsSync(path)) {
        csvWriter.writeRecords([])
          .then(() => console.log('CSV file created successfully'))
      }
      
      csvWriter.writeRecords(dataToAppend)
        .then(() => console.log('Data appended to CSV file successfully'))
}

console.log(`Warming up!`)

const intervalId = setInterval( async() => {
    if(checkTime()){
        console.log('Work Work')
        await main()      
    }
    else{
        console.log('Zug Zug!')
    }
}, interval)