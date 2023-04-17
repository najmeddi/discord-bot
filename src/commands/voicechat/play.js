const ytdl = require("ytdl-core"); // Previous working version was 4.9.1
const ytSearch = require("yt-search");
const Member = require("../../models/member");
const { embed } = require("../../discord-templates/embed.js");
const { button, menu, modal } = require("../../discord-templates/row");
const { getUserId } = require("../../discord-templates/actions");

// Required for v13 as previous voice channel join method is depricated
const {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const {
  hyperlink,
  inlineCode,
  memberNicknameMention,
} = require("@discordjs/builders");

// Creates a queue for playing tracks in voice channel
// This is for all of the servers
const queue = new Map();
// queue(message.guild.id, queue_constructor object { voice channel, text channel, connection, song[]})

module.exports = {
  name: "play",
  aliases: ["p", "skip", "stop", "s", "playlist", "pl", "queue", "q"],
  description:
    "Play the audio from the given YouTube link or search query on a voice chat. You can use the `-all` or `-a` flags to get a list of search results before playing them.",
  args: false,
  usage: "[YouTube url link or search keywords]",
  cooldown: 0,
  category: "Voice Chat",
  maxTracks: 25,
  imageURL:
    "https://cdn.discordapp.com/attachments/885611257074438154/977758141376782386/unknown.png",
  getPlayEmbed: (title, description, fields = null) =>
    embed.createBaseEmbed({
      title: title,
      description: description,
      fields: fields,
      thumbnail: module.exports.imageURL,
    }),
  async execute(message, args, client, commandName) {
    const getEmbed = module.exports.getPlayEmbed;
    const userId = getUserId(message);

    try {
      // The server for playing songs in a queue
      const server_queue = queue.get(message.guildId);
      // Get the voice channel the user is in
      const voice_channel = message.member.voice.channel;
      // By pass checking if member is in voice channel b.c. it's handeled in displayPlaylist()
      if (commandName == "playlist" || commandName == "pl") {
        return message.channel.send(
          await module.exports.displayPlaylist(
            message,
            server_queue,
            voice_channel
          )
        );
      }
      if (commandName == "queue" || commandName == "q") {
        const displayQueue = (message) => {
          const server_queue = queue.get(message.guildId);
          // Omit the first track since it's currenly being played
          const queuedSongs =
            server_queue && server_queue.songs
              ? server_queue.songs.slice(1)
              : [];
          // Given that there is a queue of tracks display the queue
          if (queuedSongs.length < 1)
            return {
              content: memberNicknameMention(userId),
              embeds: [
                getEmbed(
                  "Queue Empty",
                  "There are currently no tracks in the queue"
                ),
              ],
              components: [],
            };

          const queueEmbedField = queuedSongs.map((qs) => {
            return {
              name: `${queuedSongs.indexOf(qs) + 1}. ${qs.title}`,
              value: hyperlink(qs.url),
            };
          });

          const removalOptions = queuedSongs.map((qs) => {
            return {
              label: `${queuedSongs.indexOf(qs) + 1}. ${qs.title}`,
              value: server_queue.songs.indexOf(qs).toString(),
            };
          });

          const removeQueuedTracks = (interaction) => {
            const indices = interaction.values;
            // Select the songs that have not been selected based on the matching indices
            // button.createSimpleButton(interaction, 'View Queue', i => i.update(displayQueue(i)), '🎵')
            server_queue.songs = server_queue.songs.filter(
              (qs) =>
                !indices.includes(server_queue.songs.indexOf(qs).toString())
            );
            interaction.update({
              content: memberNicknameMention(userId),
              embeds: [
                getEmbed(
                  "Tracks Removed",
                  `Successfully removed ${inlineCode(
                    indices.length
                  )} tracks from the queue`
                ),
              ],
              components: [],
            });
          };

          return {
            content: memberNicknameMention(userId),
            embeds: [
              getEmbed(
                "Track Queue",
                `Currently playing: ${inlineCode(
                  server_queue.songs[0].title
                )}\n\nBelow is the current Queue. ${
                  queuedSongs.length > 25
                    ? `There are ${inlineCode(
                        queuedSongs.length - 25
                      )} more tracks that have been omitted from this list`
                    : ""
                }`,
                queueEmbedField
              ),
            ],
            components: [
              menu.createManySelect(
                message,
                "Select tracks to remove from the queue",
                removalOptions,
                removeQueuedTracks
              ),
            ],
          };
        };
        message.channel.send(displayQueue(message));
      }
      // Check that the member is in a voice channel
      if (!voice_channel)
        return message.channel.send({
          content: memberNicknameMention(userId),
          embeds: [
            getEmbed(
              "Not in Voice Channel",
              "You need to be in a voice channel so I know where to serenade you with music"
            ),
          ],
        });

      if (commandName == "play" || commandName == "p") {
        // Check if an argument for a link or search keywords have been given
        if (args.length == 0)
          return message.channel.send({
            content: memberNicknameMention(userId),
            embeds: [
              getEmbed(
                "URL/Query Not Found",
                "You need to provide a YouTube link or keywords for a YouTube search query"
              ),
            ],
          });

        // Get the channel name that this command was requested
        const message_channel_name = message.channel.name;

        // Check the args for the -all or -a flag (meaning to provide a list of a search results)
        if (args[0] == "-all" || args[0] == "-a") {
          // Check that a search query is provided after the flag
          if (args.length < 2)
            return message.channel.send({
              content: memberNicknameMention(userId),
              embeds: [
                getEmbed(
                  "Search Query Not Found",
                  `You need to provide a YouTube search query after the ${inlineCode(
                    args[0]
                  )} flag`
                ),
              ],
            });

          // Get the search query from the args by removing the flag
          var givenQuery = args;
          givenQuery.shift();

          // Define a function to get an array of search results
          const video_finder = async (query) => {
            const video_result = await ytSearch(query);
            // Given there exists seaarch results return the first video found otherwise return nothing
            return video_result.videos.length > 1 ? video_result.videos : null;
          };

          // Get the arguments join them into a single string and use as search query
          const videos = await video_finder(givenQuery.join(" "));

          const videosField = videos.map((video) => {
            // The number of characters in a title may be too long to show in embed or options
            let videoTitle = `${videos.indexOf(video) + 1}. ${video.title}`;
            if (videoTitle.length > 100)
              videoTitle = videoTitle.substring(0, 90) + "...";
            return { name: `${videoTitle}`, value: `${video.url}` };
          });

          const options = videos.map((video) => {
            // The number of characters in a title may be too long to show in embed or options
            let videoTitle = `${videos.indexOf(video) + 1}. ${video.title}`;
            if (videoTitle.length > 100)
              videoTitle = videoTitle.substring(0, 90) + "...";
            return { label: `${videoTitle}`, value: `${video.url}` };
          });

          // On the collect event, grab what video the user selected and use the url value to play the song in the voice chat
          const playSelected = (i) => {
            i.values.forEach((value) => {
              // Get the voice channel the user is in
              message.guild.members
                .fetch(i.user.id)
                .then((user) => {
                  const voice_channel = user.voice.channel;
                  // Check that the member is in a voice channel
                  if (!voice_channel)
                    return i.update({
                      embeds: [
                        getEmbed(
                          "Not in Voice Channel",
                          "You need to be in a voice channel so I know where to serenade you with music"
                        ),
                      ],
                      components: [],
                    });
                  module.exports.play_song(
                    [value],
                    server_queue,
                    voice_channel,
                    message
                  );
                  i.update({
                    embeds: [
                      getEmbed(
                        "Video Selected",
                        `You have selected a ${hyperlink(
                          "video",
                          value
                        )} to be played`
                      ),
                    ],
                    components: [],
                  });
                })
                .catch((err) => {
                  return message.channel.send({
                    embeds: [embed.createErrorEmbed(err)],
                  });
                });
            });
          };

          const allVideosEmbed = getEmbed(
            "YouTube Search Results",
            "List of YouTube videos from search results",
            videosField
          );
          const row = menu.createSimpleSelect(
            message,
            "Select a video to play in the voice chat",
            options,
            playSelected
          );
          message.channel.send({
            content: memberNicknameMention(userId),
            embeds: [allVideosEmbed],
            components: [row],
          });
        } else {
          // Play song of first search result
          module.exports.play_song(args, server_queue, voice_channel, message);
        }
      } else if (commandName == "skip") {
        console.log("Song skipped");
        skip_song(message, server_queue);
      } else if (commandName == "stop" || commandName == "s") {
        console.log("Song stopped");
        stop_song(message, server_queue);
      }
    } catch (err) {
      return message.channel.send({
        embeds: [
          embed.createErrorEmbed(
            `There was an error either executing this command or playing the provided URL/keywords: ${err}`
          ),
        ],
      });
    }
  },
  play_song: async (givenQuery, server_queue, voice_channel, message) => {
    try {
      // Create a song object that will be put into the song array in the queue
      let song = {};
      // This section will check if the the givenQuery is a link or set of keywords
      if (ytdl.validateURL(givenQuery[0])) {
        // Get all the song information from that url
        const song_info = await ytdl.getInfo(givenQuery[0]);
        // Pass in values to the song object
        song = {
          title: song_info.videoDetails.title,
          url: song_info.videoDetails.video_url,
        };
      } else {
        // If the givenQuery is not url then do a search on the keywords to get a video
        const video_finder = async (query) => {
          const video_result = await ytSearch(query);
          // Given there exists seaarch results return the first video found otherwise return nothing
          return video_result.videos.length > 1 ? video_result.videos[0] : null;
        };

        // Get the arguments join them into a single string and use as search query
        const video = await video_finder(givenQuery.join(" "));

        try {
          // Get all the song information from that url
          const song_info = await ytdl.getInfo(video.url);
          // Check if a video exists from the search
          if (video) {
            // Pass in info of video same as above as if it was a link
            song = {
              title: song_info.videoDetails.title,
              url: song_info.videoDetails.video_url,
            };
          } else {
            // Send error message if a video could not be found in the search
            return message.channel.send({
              embeds: [
                embed.createErrorEmbed(
                  "There was an error finding the YouTube video."
                ),
              ],
            });
          }
        } catch (err) {
          return message.channel.send({
            embeds: [embed.createErrorEmbed(err)],
          });
        }
      }

      await module.exports.queueInsert(
        song,
        server_queue,
        voice_channel,
        message
      );
    } catch (err) {
      return message.channel.send({
        embeds: [
          embed.createErrorEmbed(
            `There was an error either executing this command or playing the provided URL/keywords: ${err}`
          ),
        ],
      });
    }
  },
  queueInsert: async (song, server_queue, voice_channel, message) => {
    const getEmbed = module.exports.getPlayEmbed;
    // Check if this server has a queue initialized
    if (!server_queue) {
      // Create a queue constructor
      const queue_constructor = {
        voice_channel: voice_channel, // voice channel user is in
        text_channel: message.channel, // channel to notify which song is playing
        connection: null, //
        songs: [], // holds songs added by users
      };

      // Grab global queue and set a key (guild id) for this server as well as the constructor
      queue.set(message.guildId, queue_constructor);
      queue_constructor.songs.push(song);

      try {
        // Method to join voice channeld for v13

        // See if connection can be established
        const connection = await joinVoiceChannel({
          channelId: voice_channel.id,
          guildId: message.guildId,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        // Handles the event that the bot is disconnected
        connection.on(
          VoiceConnectionStatus.Disconnected,
          async (oldState, newState) => {
            console.log("Disconnected from voice channel");
            // Construct the embed for what is now playing
            const disconnectEmbed = getEmbed(
              "Queue is Empty",
              "I was removed from the voice channel. There are no more song tracks in the queue."
            );
            message.channel.send({ embeds: [disconnectEmbed] });
            queue.delete(message.guildId);
            connection.destroy();
          }
        );

        queue_constructor.connection = connection;

        // Pass in the guild and the first song in queue
        await video_player(message.guild, queue_constructor.songs[0]);
      } catch (err) {
        // If there is an error delete the entire server list from the global queue
        queue.delete(message.guild);
        return message.channel.send({
          embeds: [
            embed.createErrorEmbed(`There was a connection error: ${err}`),
          ],
        });
      }
    } else {
      // Given there exists a server queue add the next song to the queue
      server_queue.songs.push(song);
      // Construct the embed for what is being added to the queue
      const addedToQueueEmbed = getEmbed(
        "Song Added to Queue",
        `${hyperlink(song.title, song.url)} has been added to the queue`
      );
      return message.channel.send({ embeds: [addedToQueueEmbed] });
    }
  },
  displayPlaylist: async (message, server_queue, voice_channel) => {
    const userId = getUserId(message);
    const getPlayEmbed = module.exports.getPlayEmbed;
    const messageResponse = await Member.findOne({
      userId: userId,
      guildId: message.guildId,
    })
      .then((member) => {
        const inputLabel = `YouTube URL Link`;
        const textInputId = `${message.id}-${inputLabel}-textInput`;
        const addTrack = async (interaction) => {
          const url = interaction.fields.getTextInputValue(textInputId);
          // Check that the text given is a valid YouTube URL
          if (!ytdl.validateURL(url))
            return interaction.update({
              content: memberNicknameMention(userId),
              embeds: [
                getPlayEmbed(
                  "Invalid YouTube URL",
                  "The link you provided is not a valid YouTube URL link"
                ),
              ],
              components: [
                await module.exports.viewPlaylistBtn(
                  interaction,
                  server_queue,
                  voice_channel
                ),
              ],
            });

          // Get the title and url from the link
          const songInfo = await ytdl.getInfo(url);
          const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
          };

          // Check if this song has already been added in the member's playlist
          if (member.playlist.map((song) => song.url).includes(song.url))
            return interaction.update({
              content: memberNicknameMention(userId),
              embeds: [
                getPlayEmbed(
                  "Track Already Exists",
                  `The YouTube track ${inlineCode(
                    song.title
                  )} is already included in your playlist`
                ),
              ],
              components: [
                await module.exports.viewPlaylistBtn(
                  interaction,
                  server_queue,
                  voice_channel
                ),
              ],
            });

          // Add and save the track in the member's playlist
          member.playlist.push(song);
          await member
            .save()
            .then(async (result) => {
              return interaction.update({
                content: memberNicknameMention(userId),
                embeds: [
                  getPlayEmbed(
                    "Track Added",
                    `The YouTube track ${inlineCode(
                      song.title
                    )} is now saved in your playlist`
                  ),
                ],
                components: [
                  await module.exports.viewPlaylistBtn(
                    interaction,
                    server_queue,
                    voice_channel
                  ),
                ],
              });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };
        const removeTracks = async (interaction) => {
          await Member.findOne({ userId: userId, guildId: message.guildId })
            .then(async (member) => {
              member.playlist = member.playlist.filter((song) => {
                return !interaction.values.includes(song.url);
              });
              await member
                .save()
                .then(async (result) => {
                  return interaction.update({
                    content: memberNicknameMention(userId),
                    embeds: [
                      getPlayEmbed(
                        "Track(s) Removed",
                        `Successfully removed ${inlineCode(
                          interaction.values.length
                        )} tracks from your playlist`
                      ),
                    ],
                    components: [
                      await module.exports.viewPlaylistBtn(
                        interaction,
                        server_queue,
                        voice_channel
                      ),
                    ],
                  });
                })
                .catch((err) => {
                  return message.channel.send({
                    embeds: [embed.createErrorEmbed(err)],
                  });
                });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };
        const displayRemoveTrackMenu = async (interaction) => {
          await Member.findOne({ userId: userId, guildId: message.guildId })
            .then((member) => {
              const removalOptions = member.playlist.map((song) => {
                return {
                  label: `${song.title}`,
                  value: song.url,
                };
              });
              interaction.update({
                components: [
                  menu.createManySelect(
                    message,
                    "Select tracks to remove",
                    removalOptions,
                    removeTracks
                  ),
                ],
              });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };
        const queueTrackDisplay = async (interaction) => {
          await Member.findOne({ userId: userId, guildId: message.guildId })
            .then(async (member) => {
              const tracksArr = member.playlist.filter((song) => {
                return interaction.values.includes(song.url);
              });
              await module.exports.queueTracks(
                tracksArr,
                message,
                voice_channel
              );
              return interaction.update({
                content: memberNicknameMention(userId),
                embeds: [
                  getPlayEmbed(
                    "Track(s) Queued",
                    `Successfully queued ${inlineCode(
                      tracksArr.length
                    )} tracks from your playlist`
                  ),
                ],
                components: [
                  await module.exports.viewPlaylistBtn(
                    interaction,
                    server_queue,
                    voice_channel
                  ),
                ],
              });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };
        const displayQueueTrackMenu = async (interaction) => {
          if (!message.member.voice.channel)
            return interaction.update({
              content: memberNicknameMention(userId),
              embeds: [
                getPlayEmbed(
                  "Not in Voice Channel",
                  "You need to be in a voice channel so I know where to serenade you with music"
                ),
              ],
              components: [await module.exports.viewPlaylistBtn(interaction)],
            });
          await Member.findOne({ userId: userId, guildId: message.guildId })
            .then((member) => {
              const options = member.playlist.map((song) => {
                return {
                  label: `${song.title}`,
                  value: song.url,
                };
              });
              interaction.update({
                components: [
                  menu.createManySelect(
                    message,
                    "Select tracks to queue",
                    options,
                    queueTrackDisplay
                  ),
                ],
              });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };

        const queuePlaylist = async (interaction) => {
          if (!message.member.voice.channel)
            return interaction.update({
              content: memberNicknameMention(userId),
              embeds: [
                getPlayEmbed(
                  "Not in Voice Channel",
                  "You need to be in a voice channel so I know where to serenade you with music"
                ),
              ],
              components: [await module.exports.viewPlaylistBtn(interaction)],
            });
          await Member.findOne({ userId: userId, guildId: message.guildId })
            .then(async (member) => {
              await module.exports.queueTracks(
                member.playlist,
                message,
                voice_channel
              );
              return interaction.update({
                content: memberNicknameMention(userId),
                embeds: [
                  getPlayEmbed(
                    "Track(s) Queued",
                    `Successfully queued ${inlineCode(
                      member.playlist.length
                    )} tracks from your playlist`
                  ),
                ],
                components: [
                  await module.exports.viewPlaylistBtn(
                    interaction,
                    server_queue,
                    voice_channel
                  ),
                ],
              });
            })
            .catch((err) => {
              return message.channel.send({
                embeds: [embed.createErrorEmbed(err)],
              });
            });
        };
        const addTrackModal = modal.createSimpleModal(
          message,
          "Enter the YouTube URL link",
          inputLabel,
          "Add Track",
          addTrack,
          "➕",
          "SUCCESS"
        );
        const removeTracksButton = button.createSimpleButton(
          message,
          "Remove Tracks",
          displayRemoveTrackMenu,
          "✖️"
        );
        const queueTracksButton = button.createSimpleButton(
          message,
          "Queue Tracks",
          displayQueueTrackMenu,
          "⏯️",
          "SECONDARY"
        );
        const queuePlaylistButton = button.createSimpleButton(
          message,
          "Queue Playlist",
          queuePlaylist,
          "🎵",
          "PRIMARY"
        );

        // Check if the member has anything saved in their playlist
        if (member.playlist && member.playlist.length < 1) {
          return {
            content: memberNicknameMention(userId),
            embeds: [
              getPlayEmbed(
                "Playlist Empty",
                "You have no saved YouTube links in your playlist."
              ),
            ],
            components: [addTrackModal],
          };
        } else if (member.playlist) {
          const trackFields = member.playlist.map((song) => {
            return {
              name: `${song.title}`,
              value: hyperlink(song.url),
            };
          });
          let components = [
            removeTracksButton,
            queueTracksButton,
            queuePlaylistButton,
          ];
          if (member.playlist.length < module.exports.maxTracks)
            components.unshift(addTrackModal);
          return {
            content: memberNicknameMention(userId),
            embeds: [
              getPlayEmbed(
                "Your Playlist",
                "The playlist of your saved tracks below.",
                trackFields
              ),
            ],
            components: components,
          };
        } else {
          return message.channel.send({
            embeds: [embed.createErrorEmbed("The playlist does not exist")],
          });
        }
      })
      .catch((err) => {
        return message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
      });
    return messageResponse;
  },
  viewPlaylistBtn: async (message, server_queue, voice_channel) => {
    const viewPlaylist = async (interaction) =>
      interaction.update(
        await module.exports.displayPlaylist(
          message,
          server_queue,
          voice_channel
        )
      );
    return button.createSimpleButton(
      message,
      "View Playlist",
      viewPlaylist,
      "🎶"
    );
  },
  queueTracks: async (tracksArr, message, voice_channel) => {
    for (let i = 0; i < tracksArr.length; i++) {
      const song = tracksArr[i];
      if (!voice_channel) voice_channel = message.member.voice.channel;
      const server_queue = queue.get(message.guildId);
      if (!server_queue)
        await module.exports.queueInsert(
          song,
          server_queue,
          voice_channel,
          message
        );
      else server_queue.songs.push(song);
    }
  },
};

const video_player = async (guild, song) => {
  const song_queue = queue.get(guild.id);

  // Check if there currently is no song (i.e. queue is empty)
  if (!song) {
    // Leave the channel
    song_queue.connection.disconnect();
    queue.delete(guild.id);
    // Return so actual video doesn't have to play
    return;
  }
  // This holds actual stream that will be streamed into the channel
  // The highWaterMark option set to 32MiB fixes issues with Node.js v16 (16.5.0)
  const stream = ytdl(song.url, {
    filter: "audioonly",
    highWaterMark: 1 << 25,
  });
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
  });
  // This will play audio resources
  const player = createAudioPlayer();

  player.play(resource);

  // Play using the song queue's connection
  song_queue.connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, async () => {
    // Once the song is done shift to the next song
    song_queue.songs.shift();
    await video_player(guild, song_queue.songs[0]);
  });

  // Construct the embed for what is now playing
  const nowPlayingEmbed = module.exports.getPlayEmbed(
    "Now Playing",
    `${hyperlink(song.title, song.url)} is now playing the voice chat`
  );
  await song_queue.text_channel.send({ embeds: [nowPlayingEmbed] });
};

const skip_song = async (message, server_queue) => {
  const getEmbed = module.exports.getPlayEmbed;
  // Check that the user is in a voice channel since they cannot skip a song otherwise
  if (!message.member.voice.channel)
    return message.channel.send({
      embeds: [
        getEmbed(
          "Unable to Skip",
          "You need to be in a voice channel to skip a track"
        ),
      ],
    });

  // Check if there is a sever queue in order for the skip to apply
  if (!server_queue)
    return message.channel.send({
      embeds: [
        getEmbed("Nothing to Skip", "There are no songs in the queue to skip"),
      ],
    });

  //  shift to the next song
  server_queue.songs.shift();
  await video_player(message.guild, server_queue.songs[0]);
  message.react("⏭");
};

const stop_song = (message, server_queue) => {
  const getEmbed = module.exports.getPlayEmbed;
  const userId = getUserId(message);
  // Check that the user is in a voice channel since they cannot stop a song otherwise
  if (!message.member.voice.channel)
    return message.channel.send({
      embeds: [
        getEmbed(
          "Unable to Stop",
          "You need to be in a voice channel to stop a track"
        ),
      ],
    });
  // Check if there is a sever queue in order for the skip to apply
  if (!server_queue)
    return message.channel.send({
      embeds: [
        getEmbed("Nothing to Stop", "There are no songs in the queue to stop"),
      ],
    });

  // Check that there are no more songs in the queue. If there is one song, then
  // it means it's the one currently playing
  const songs_left = server_queue.songs.slice(1);
  if (songs_left.length > 0) {
    // Tell the user that there are still songs in the queue
    const songsLeftField = songs_left.map((song) => {
      return { name: song.title, value: song.url };
    });

    const notifyQueueEmbed = getEmbed(
      "Queue Not Empty",
      `Stopping will remove all songs in the queue. Are you sure you want to continue? It's a big decision, think carefully`,
      songsLeftField
    );
    // Constant to hold the name of the custom id of the select buttons
    const stopQueueCustomId = `${message.id}stop-queue`;
    const cancelStopCustomId = `${message.id}cancel`;

    const stopPlaying = (i) => {
      // Clear the entire queue of songs
      server_queue.songs = [];
      try {
        // Leave voice channel
        server_queue.connection.disconnect();
        message.react("⏹");
        i.update({
          embeds: [
            getEmbed(
              "Stopped Track",
              "Track(s) has been stopped and queue has been cleared"
            ),
          ],
          components: [],
        });
      } catch (err) {
        return i.update({ embeds: [embed.createErrorEmbed(err)] });
      }
    };

    const cancelStop = (i) => {
      i.update({
        embeds: [
          getEmbed("Stop Cancelled", "Stopping the track has been cancelled"),
        ],
        components: [],
      });
    };

    const row = button.createButtons({
      message: message,
      labels: ["Stop Playing", "Cancel"],
      emojis: ["🛑", "❌"],
      styles: ["DANGER", "SECONDARY"],
      funcs: [stopPlaying, cancelStop],
    });
    message.channel.send({
      content: memberNicknameMention(userId),
      embeds: [notifyQueueEmbed],
      components: [row],
    });
  } else {
    // Clear the entire queue of songs
    server_queue.songs = [];
    try {
      // Leave voice channel
      server_queue.connection.disconnect();
      message.react("⏹");
    } catch (err) {
      message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
    }
  }
};
