import { XMLHttpRequest } from "xmlhttprequest"
import { Client } from "discord.js"

// make sure you set these env values
const cookie = ".ROBLOSECURITY=" + process.env.robloSecurity
const botToken = process.env.botToken
const cooldownSeconds = process.env.cooldown || 60

const tokenUrl = "https://auth.roblox.com/v2/logout"
const productInfoUrl = "https://api.roblox.com/marketplace/productinfo?assetId=@"
const productBuyUrl = "https://economy.roblox.com/v1/purchases/products/@"
const cooldowns = {}
const client = new Client( { intents: [] } )

// runs when the bot logs in
client.on("ready", async function() {
	console.log("ready");
});

// runs when someone uses /whitelist
client.on('interactionCreate', async function(interaction) {
	if (interaction.commandId == "1023412698073022474") {
		await interaction.deferReply()

		for (const user in cooldowns) {
			if (cooldowns[user] < Math.round(Date.now() / 1000)) delete cooldowns[user]
		}

		try {
			// the id the player is trying to whitelist
			const id = interaction.options.getInteger("id")
			
			// errors if the user is on cooldown
			if (cooldowns[interaction.user.id]) throw "__you are on cooldown, please try again later"

			// gets the token to use in the buy request
			const tokenRequest = new XMLHttpRequest
			tokenRequest.open("POST", tokenUrl, false)
			tokenRequest.setDisableHeaderCheck(true)
			tokenRequest.setRequestHeader("cookie", cookie)
			tokenRequest.send()
			const token = tokenRequest.getResponseHeader("x-csrf-token")

			// gets info of the asset
			const productInfoRequest = new XMLHttpRequest
			productInfoRequest.open("GET", productInfoUrl.replace("@", id), false)
			productInfoRequest.send()
			const productInfo = JSON.parse(productInfoRequest.responseText)

			// errors if the map isn't a model
			if (productInfo.AssetTypeId != 10) throw "__id is not a model"

			// purchases the asset
			const productBuyRequest = new XMLHttpRequest
			productBuyRequest.open("POST", productBuyUrl.replace("@", productInfo.ProductId), false)
			productBuyRequest.setDisableHeaderCheck(true)
			productBuyRequest.setRequestHeader("Content-Type", "application/json; charset=UTF-8")
			productBuyRequest.setRequestHeader("cookie", cookie)
			productBuyRequest.setRequestHeader("x-csrf-token", token)
			productBuyRequest.send(JSON.stringify({ expectedCurrency: 1, expectedPrice: 0, expectedSellerId: productInfo.Creator.CreatorTargetId }))
			const productBuyResponse = JSON.parse(productBuyRequest.responseText)

			// errors if the purchase failed
			if (!productBuyResponse.purchased) throw "__id is already whitelisted"

			cooldowns[interaction.user.id] = Math.round(Date.now() / 1000) + cooldownSeconds
			await interaction.editReply("Successfully whitelisted " + id)
		} catch (e) {
			let reason = "throttled by roblox, please try again later"
			if (typeof(e) == "string" && e.startsWith("__")) reason = e.slice(2)
			await interaction.editReply("Whitelisting failed: " + reason)
		}
	}
});

client.login(botToken)