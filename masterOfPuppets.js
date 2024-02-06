const puppeteer = require('puppeteer')

async function masterOfPuppets (url, username, password){

    const browser = await puppeteer.launch(
        {
            // headless: false,
            headless: "new",
            args: [
                "--disable-gpu",
                "--no-sandbox",
                "--disable-web-security",
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            ignoreHTTPSErrors: true
        })

    try{

        const page = await browser.newPage()
        await page.setViewport({width: 1500, height: 800})


        const response = await page.goto(`${url}`, {waitUntil:"networkidle2"})
        console.log(`Response Status Code: ${response.status()}`)

        if(!response || response.status() !== 200){
            browser.close()
            return [`Failed to load the page.`, response.status()]
        }
        
        await login(page, username, password)
        await system_config(page)
        await security_click(page)
        await user_adm_click(page)
        await start_search(page)
        const result = await get_users(page)
        
        await page.waitForTimeout(1000)
        await browser.close()
        if(!result) return 'Failed'
        return result

        }
    catch(error){
        console.error('Error from Master of Puppets:')

        if(error.name === 'TimeoutError'){
            console.error('Navigation timeout Error', error)
        }
        else console.error ('Other Error: ', error)
        
        await browser.close()
        return console.log('FAILED')
    }
}

async function login(page, username, password){


    await page.waitForSelector('body > auth-root > auth-signin-passphrase > auth-layout > div > ukg-card')
    await page.waitForSelector('#username')
    await page.locator('body > auth-root > auth-signin-passphrase > auth-layout > div > ukg-card').click()
        
    const sing_in_btn = await page.locator('#button-sign-in')
    
    await page.type('#username', username, {delay: 20})
    await page.type('#passphrase > div > input', password, {delay: 20})

    await sing_in_btn.click()
    await page.waitForNavigation()
    await page.waitForSelector('#unified-nav-side-nav') // awaiting for the navbar to load to confirm successful log in attempt.
    return console.log('Logged in')
}

async function system_config(page){
    
    const isShadowRootOpen = await page.evaluate(() => {
        const shadowRoot = document.querySelector('#\\35 96 > div > ukg-nav-item').shadowRoot
        
        return shadowRoot.mode === 'open'
    })
    
    if (!isShadowRootOpen) {
        console.log('ShadowRoot failed.')
        return false
    }
    
    const sys_btn = await page.locator('#menu_sys_cfg')
    await sys_btn.click()

    await page.waitForTimeout(2000)
    
    const check_sys_config = await page.evaluate(() => {
        const str = 'System Configuration'
        const h2 = document.querySelector('#unified-nav-menu > div > div > div.sc-ukg-nav-menu > h2')
        
        if (h2.innerText !== str){
            console.log(`Failed to click on system btn`)
            return false
        }
        return true
    })

    if(!check_sys_config) return false
}

async function security_click(page){
    const security_btn = await page.locator('#\\35 96 > div > ukg-nav-item')

    const check_sec_btn = await page.evaluate(async() => {
        const shadowRoot = document.querySelector('#\\35 96 > div > ukg-nav-item').shadowRoot
        const btn_txt = shadowRoot.querySelector('div > div.nav-item-text').innerText
        console.log(`check_sec_btn is: ${btn_txt}`)

        if (btn_txt !== 'Security'){
            return false
        }
        return true
    })
    
    if(!check_sec_btn) return false
    
    await security_btn.click()

    await page.waitForTimeout(1000)
}

async function user_adm_click(page){

    await page.evaluate(async () => {
        const shadowRoot = document.querySelector('#\\32 397').shadowRoot
        const btn_txt = shadowRoot.querySelector('div').innerText
        console.log((`user_adm_btn is: ${btn_txt}`))

        if(btn_txt != 'User Administration') return false

        await shadowRoot.querySelector('div').click()
        return true
    })
}

async function start_search(page){

    await page.waitForSelector('#ContentFrame', 'load')

    const iframeElementHandle = await page.$('#ContentFrame')
    
    if(!iframeElementHandle) return console.log("Fail to get iFrame")

    const frame = await iframeElementHandle.contentFrame()

    await page.waitForTimeout(3000)
    const controlFiled = await frame.locator('#grvUserSummary_firstSelect_0')
    await controlFiled.click()

    for(let i = 0; i < 3; i++){
        await page.keyboard.press('ArrowDown',)
        await page.waitForTimeout(50)
    }
    await page.keyboard.press('Enter')

    await page.waitForTimeout(1000)
    
    const controlOperator = await frame.locator('#grvUserSummary_Operator_0')
    await controlOperator.click()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(50)
    await page.waitForTimeout(1000)
    
    const controlValue = await frame.locator('#grvUserSummary_CodeSelector_0')
    await controlValue.click()
    await page.waitForTimeout(50)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(50)
    await page.keyboard.press('Enter')
    
    await page.waitForTimeout(1000)
    
    await search_btn(frame)
    
    await page.waitForTimeout(1000)
    await frame.waitForSelector('#ctl00_Content_grvUserSummary > tbody > tr', {waitUntil: "load"})
    
    if(!frame) return console.log(`Failed to get iFrame`)
    return true
}

async function search_btn(frame){
    const search_btn = await frame.locator("#grvUserSummary_filterButton")
    await search_btn.click()
}

async function get_users(page){

    
    const toActivate = []
    const toReset = []
    const skipped = []
    
    const statuses_account = {
        "A": "Active",
        "I": "Inactive",
        "L": "Locked",
        "R": "Restricted",
        "S": "Suspended"
    }
    
    const statuses_emp = {
        "A": "Active",
        "L": "Leave of absence",
        "O": "On strike",
        "R": "Released/laid off",
        "S": "Suspended",
        "T": "Terminated"
    }
    
    await users_to_activate(page)
    await page.waitForTimeout(5000)
    await users_to_reset(page)
    
    async function users_to_activate(page){

        await page.waitForSelector('#ContentFrame', 'load')
        const iframeElementHandle = await page.$('#ContentFrame')
        if(!iframeElementHandle) return console.log("Fail to get iFrame")
        const frame = await iframeElementHandle.contentFrame()

        const rows = await frame.$$('#ctl00_Content_grvUserSummary > tbody > tr')

        for(let row of rows){

            const user = new Object
                    
            const fullNameCell = await row.$('td:nth-child(2)')
            if(!fullNameCell) return 'Failed to get fullName from a row'
            const fullName = await frame.evaluate(el => el.innerText, fullNameCell)
            
            const usernameCell = await row.$('td:nth-child(3)')
            if(!usernameCell) return 'Failed to get username from a row'
            const username = await frame.evaluate(el => el.innerText, usernameCell)
            
            const accountCell = await row.$('td:nth-child(5)')
            if(!accountCell) return `Failed to get account status from a row`
            const account_status = await frame.evaluate(el => el.innerText, accountCell)
            
            const empCell = await row.$('td:nth-child(6)')
            if(!empCell) return `Failed to get employment status from a row`
            const emp_status = await frame.evaluate(el => el.innerText, empCell)
            
            const lastLogonCell = await row.$('td:nth-child(8)')
            if(!lastLogonCell) return `Failed to get employment status from a row`
            const lastLogon_status = await frame.evaluate(el => el.innerText, lastLogonCell)
            

            if(emp_status !== statuses_emp.A || account_status === statuses_account.S) {
                user.fullName = fullName
                user.username = username
                user.account_status = account_status
                user.employmentStatus = emp_status
                user.lastLogon_status = lastLogon_status
                user.action = "Skip"
                skipped.push(user)
            }

            else if ((account_status === statuses_account.I || 
                            account_status === statuses_account.L || 
                            account_status === statuses_account.R) && 
                            lastLogon_status !== ""){
                
                user.fullName = fullName
                user.username = username
                user.account_status = account_status
                user.employmentStatus = emp_status
                user.lastLogon_status = lastLogon_status
                user.action = 'Activate'
                toActivate.push(user)

                const action_chk_box = await row.$('td:nth-child(1) > input')
                if(!action_chk_box) return console.log(`Failed to get input`)
                await action_chk_box.click()
            }
        }

        if (toActivate.length === 0) return console.log("No users to activate.")

        const set_active_btn = await frame.$('#ToolBarAction_gridToolbar_SetActive')
        const check_set_active_btn = await frame.evaluate(el => el.innerText, set_active_btn)
        console.log(`${check_set_active_btn} button`)

        if(check_set_active_btn === "Set active"){
            await frame.waitForTimeout(1000)
            await set_active_btn.click()
            console.log(`Click on set active here`)
        }
    }


    async function users_to_reset(page){

        await page.waitForSelector('#ContentFrame', 'load')
        const iframeElementHandle = await page.$('#ContentFrame')
        if(!iframeElementHandle) return console.log("Fail to get iFrame")
        const frame = await iframeElementHandle.contentFrame()
        await frame.waitForSelector('#ctl00_Content_grvUserSummary')

        const rows = await frame.$$('#ctl00_Content_grvUserSummary > tbody > tr')

        for(let row of rows){

            const user = new Object
                    
            const fullNameCell = await row.$('td:nth-child(2)')
            if(!fullNameCell) return 'Failed to get fullName from a row'
            const fullName = await frame.evaluate(el => el.innerText, fullNameCell)
            
            const usernameCell = await row.$('td:nth-child(3)')
            if(!usernameCell) return 'Failed to get username from a row'
            const username = await frame.evaluate(el => el.innerText, usernameCell)
            
            const accountCell = await row.$('td:nth-child(5)')
            if(!accountCell) return `Failed to get account status from a row`
            const account_status = await frame.evaluate(el => el.innerText, accountCell)
            
            const empCell = await row.$('td:nth-child(6)')
            if(!empCell) return `Failed to get employment status from a row`
            const emp_status = await frame.evaluate(el => el.innerText, empCell)
            
            const lastLogonCell = await row.$('td:nth-child(8)')
            if(!lastLogonCell) return `Failed to get employment status from a row`
            const lastLogon_status = await frame.evaluate(el => el.innerText, lastLogonCell)

            if (((account_status === statuses_account.R || 
                account_status === statuses_account.L ||    
                account_status === statuses_account.I) && 
                    lastLogon_status === "") &&  
                    emp_status === statuses_emp.A){

                user.fullName = fullName
                user.username = username
                user.account_status = account_status
                user.employmentStatus = emp_status
                user.lastLogon_status = lastLogon_status
                user.action = "Reset"
                toReset.push(user)

                const action_chk_box = await row.$('td:nth-child(1) > input')
                if(!action_chk_box) return console.log(`Failed to get input`)
                await action_chk_box.click()
            }
        }

        if (toReset.length === 0) return console.log("No users to Reset.")

        const reset_pass_btn = await frame.$("#ToolBarAction_gridToolbar_ResetPassword")
        const check_reset_pass_btn = await frame.evaluate(el => el.innerText, reset_pass_btn)
        console.log(`${check_reset_pass_btn} button`)

        if(check_reset_pass_btn === "Reset password"){
            await frame.waitForTimeout(1000)
            await reset_pass_btn.click()
            console.log(`Click on reset password here`)
        }
    }


    await page.waitForTimeout(10000)
    return [...skipped, ...toActivate, ...toReset]

}


module.exports = masterOfPuppets