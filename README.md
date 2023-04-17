# Discord Bot

A Discord bot application made that provides a wide range of options from scheduling reminders, setting alarms, creating events and other utilities, to connecting with different APIs and libraries like streaming tunes straight into the voice chat, and much more!
## Technologies & Tools

 -  **Node.js**: for running the application back-end
-   **Discord.js**: allows interaction on Discord such as embeds, interactions, and, events
-   **NPM** packages:
	- **Cheerio**: parses markup and provides an API for traversing/manipulating the resulting data structure
	- **cleverbot-free**: interacts with Cleverbot API
	- **mongoose**: object modeling tool for MongoDB for asynchronous environments
	- **node-fetch**: brings Fetch API to Node.js
	- **unirest**: set of lightweight HTTP libraries allowing for HTTP requests
-   **MongoDB**: Storing member preferences, games, jobs/tasks, reminders, and topics
- **Adobe Photoshop**: used to create various images and icons seen the embed thumbnails or in other aspects of the application

# Commands
Commands are issued within a Discord server with the prefix `$` followed by the command and any arguments. You can also interact with the bot in a message channel using by pinging it using `@<insert bot name>` followed by a message, which uses a Cleverbot API to respond to the message.

Below are the current commands you can issue

|Command             |Description                                                                 |
|--------------------|----------------------------------------------------------------------------|
|`help`              |Displays all the commands for the bot                                       |
|`alarm`             |Set an alarm within a given time                                            |
|`time-left`         |Show how much time is left on all alarms                                    |
|`add-game`          |Adds a game to the servers game list                                        |
|`add-me`            |Adds you to a list of members playing a given game                          |
|`admin-remove-games`|Allows **`@Admin`** to remove a game or game(s) from the list of members' games|
|`find-games`            |Gets a list of games members have added                         |
|`remove-me`            |Removes you from a list of members playing a given game                         |
|`heist-ready`            |Let everyone know you have a GTA V heist ready                         | 
|`wagon-ready`            |Let everyone know you have a RDR2 wagon ready                       | 
|`custom-ready`            |Let everyone know you have something ready                         | 
|`find-jobs`            |Gets a list of all active jobs members have open                        | 
|`run-jobs`            |Runs and makes a job active, notifying everyone subscribed to it                        | 
|`admin-remove-jobs`            |Allows **`@Admin`** to remove a job or jobs from the list of members' jobs                        | 
|`schedule`            |View schedule for the private channel(s)                        | 
|`add-reminder`            |Add a reminder to the schedule                         | 
|`admin-remove-reminders`            |Allows **`@Admin`** to remove reminder(s) from the servers list of member made reminders                        | 
|`topics`            |View topics for the private channel(s)                        | 
|`add-topic`            |Adds a topic for the private channel(s)`                       | 
|`admin-remove-topics`            |Allows **`@Admin`** to remove topic(s) from the servers list of member made topics`                        | 
|`play`            |Play the audio from the given YouTube link or search query on a voice chat                         | 
|`skip`            |Skip the current audio played in the voice chat                        | 
|`stop`            |Stop and disconnect from the current audio played in the voice chat                        | 
|`queue`            |Show the current audio queue that will be played in the voice chat                        | 
|`playlist`            |View, add, remove, and queue audio from YouTube that you can play in the voice chat                        |
|`madam-nazar`            |Get Madam Nazar's current location in RDO 
|`fallout-search`            |Search keywords in the Fallout 76 wiki' 
|`flipcoin`            |Flip a coin to get either heads or tails  
|`rolldice`            |Get a random number from 1 to 6 and show dice face 

# Installation

>**Important Note**: This application designed, developed, tested, and intended to work privately on a specific Discord server. As such, if you intend to you use this application for your own server, you must make necessary changes and tweaks in order for it to run properly, some of which may not be included in the steps below.
## Setup
### Download and installing from repository
1. Clone the repo or download it as a .zip file and extract it. 
2. Go to the newly created folder and navigate to `discord-bot-main > discord-bot` where `package.json` is located.
3. Open a terminal in this directory and run `npm install` or `sudo npm install` to install the dependencies for this app.
### Setting up Discord App
1. If you haven't already, make sure to you have created a Discord bot through the [Discord Developer Portal](https://discordapp.com/developers/applications/).
2. Obtain your bot's token which can be done through this guide in the provided link below which will also show how to create your bot through the developer portal.
https://www.writebots.com/discord-bot-token/ 
3. Go back to the bot's source folder and navigate to `discord-bot-main > discord-bot > src > bot.js` and open the file. Replace the default string for the constant `PRIVATE_DISCORD_BOT_TOKEN` with the token obtained from step 2. You can alternatively save the token in a `.env` file and have the constant refer to it from there.
4. In the Discord server where you include this bot, create an administrator role of your liking and name the role `Admin`. Also create two text channels and name it `announcement`  and `jobs-for-hire`.
5. **Optional:** You have the option to have commands only work on exclusive channels. By default, all commands under `discord-bot/src/commands/private` can only be executed in two specified channels. You can modify this by changing the `channels` attribute for the command modules as such.
```
module.exports = {
	...
	channels: [
		'<private channel 1 ID>', 
		'<private channel 2 ID>', 
		...,
		'<private channel N ID>'],
	...
}
```
### Integrating MongoDB
This application uses MongoDB to keep persistent user data such as preferences, time-zones, reminders, and more. You may notice certain names are given to items and this is optional as long as no conflicts arise in the application itself.

1. Create a new project in your MongoDB Atlas or preferred choice.
2. Create a new cluster and name it `Bot` and go through the initial setup MongoDB has listed.
3. Navigate to **Collections** under the `Bot` cluster, and create a new database named `common-games`.
4. Under `common-games`, create collections with the following names.
	```
	games
	jobs
	members
	reminders
	topics
	```
5. Once finished, navigate to **Database Access** under **Security** which is located on the left-hand panel of the dashboard.
6.  In Database Access, select **Add new database user** and select **Password** as the authentication method. Under **Password Authentication**, enter a name for this user and either enter a password or you can auto-generate it. You can leave the rest of the options as default, or customize to your liking, then select **Add user** when you're done.
7. Go back to `Deployment > Database` and select **Connect** under `Bot`. Then choose **Connect your application**, select `Node.js` as the driver and `4.1 or later` as the version. Next copy the link listed under step "2", which should look similar to this:

	`mongodb+srv://bot:<password>@bot.sozfc.mongodb.net/?retryWrites=true&w=majority`

	> **Note:** `<password>` in this link requires the password created in step 6.
	
8.  Now, go the bot's source folder and open the JavaScript file located at `discord-bot-main > discord-bot > src > database > mongoose.js`. Replace the default string for the constant `MONGO_DB_URL` with the link obtained form step 7. You can alternatively save the token in a `.env` file and have the constant refer to it from there.
## Running the application
You can start and run the application by navigating to the `/src/` directory running the following command:
```
$ npm start
```

If everything is running properly, you should see the following displaying on the terminal:
```
<client.user.tag> has logged in
Bot successfully connected to database
...
```
##
**Created by Omid Najmeddini**

