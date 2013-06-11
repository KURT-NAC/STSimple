(function(exports){

    function PuzzleGame()
    {
        PuzzleGame.superclass.constructor.call(this);
        return this;
    }

    PuzzleGame.prototype =
    {
        // GameState Names
        AddedGameStates :
        {
            RecordClip      : 'recordClip',
            PuzzleSolve     : 'puzzSolve',
            PuzzleResults   : 'puzzResult',
            Turn            : 'turn',

            Summary         : 'summary',
            Difficulty      : 'difficulty',
            StockPhotos     : 'stock',
            SlidePuzzle     : 'slide',
            ChooseStock     : 'choose'
        },

        // Save current puzzle image for use across multiple pages
        puzzleImage : null,
        // Server side config
        CONFIG:null,


        _addGameStates : function()
        {
            var self = this;

            // merge constants
            $.extend(true, self.GameStates, self.AddedGameStates);

            var turnPage = new (require('Turn').Turn)(self, self.director);
            turnPage.setExitStates('oppDifficulty', self.GameStates.Difficulty, self.GameStates.RecordClip);
            self.fsm.addSceneState(self.GameStates.Turn, turnPage);

            self.fsm.addSceneState(self.GameStates.RecordClip, new (require('RecordClip').RecordClip)(self, self.director));
            self.fsm.addSceneState(self.GameStates.PuzzleSolve, new (require('PuzzleSolve').PuzzleSolve)(self, self.director));
            self.fsm.addSceneState(self.GameStates.PuzzleResults, new (require('PuzzleResults').PuzzleResults)(self, self.director));

            self.fsm.addSceneState(self.GameStates.Summary, new (require('SummaryPage').SummaryPage)(self, self.director));
            self.fsm.addSceneState(self.GameStates.Difficulty, new (require('DifficultyPage').DifficultyPage)(self, self.director));
            self.fsm.addSceneState(self.GameStates.StockPhotos, new (require('StockPhotos').StockPhotos)(self, self.director));
            self.fsm.addSceneState(self.GameStates.SlidePuzzle, new (require('SlidePuzzle').SlidePuzzle)(self, self.director));
            self.fsm.addSceneState(self.GameStates.ChooseStock, new (require('ChooseStock').ChooseStock)(self, self.director));

            return self;
        },

        getName : function()
        {
            return "com.funtini.jigsawesome";
        },

        _createClientConnection : function()
        {
            var self = this;
            self.clientConnection = new (require('PuzzleClientConnection').PuzzleClientConnection)();

            //Set a default config for REFRESHRATE in case the config is not loaded in time for Active Games
            self.CONFIG="{REFRESHRATE:3000}";
            return self;
        },

        //Updates the jigsawesome game CONFIG data from S3
        updateConfig:function(){
            var self = this;
            $.ajax({
                'type': 'GET',
                'cache' : false,
                'url': "http://s3.amazonaws.com/jigsaw_config/config.json",
                'dataType': 'json'
            }).done(function(response){self._onConfigLoaded(response);})
        },

        //Processes the config once its been downloaded
        _onConfigLoaded:function(data){
            var self = this;
            self.CONFIG=data;
        },

        _createSplashManifest : function()
        {
            var self = this;

            var manifest = {
                // Splash assets
                splash1:"assets/cutouts/title_funtini.png",
                splash2:"assets/cutouts/title_jigsawesome.jpg"
            }

            return manifest;
        },

        _createMainManifest : function()
        {
            var self = this;

            var manifest = {
                // General assets
                correct:"assets/cutouts/correct.png",
                sliceSprite:"assets/threeSliceButton.png",
                buttonType1Slice:"assets/typeOneSlice.png",
                buttonType1SliceExt:"assets/typeOneSliceExt.png",
                buttonType1SliceExtGrey:"assets/typeOneSliceExtGrey.png",
                buttonType2Slice:"assets/typeTwoSlice.png",
                bannerOrange:"assets/bannerOrange.png",
                background:"assets/background.png",
                banner:"assets/cutouts/banner.png",
                bannerLarge:"assets/cutouts/banner_large.png",
                footerBreak:"assets/cutouts/pg2_line.png",
                footer:"assets/cutouts/pg2_footer" + g_game.filePlatform + ".png",
                plus:"assets/cutouts/plusicon.png",
                checkbox:"assets/cutouts/yesicon.png",
                noIcon:"assets/cutouts/pg2_noicon.png",
                topDarkener:"assets/cutouts/topbar.png",
                guessCircle:"assets/cutouts/pg2_guess_circle.png",
                scrollArrow:"assets/cutouts/awesome_arrow_small.png",
                toggleButton:"assets/cutouts/toggle_button.png",
                createBG:"assets/cutouts/creategame_midbar.png",
                storeFrontBG:"assets/cutouts/creategame_midbar.png",
                loadingIcon:"assets/cutouts/loading_icon.png",
                backIcon:"assets/cutouts/backicon_sm.png",


                // Page View Controls
                upArrowIcon:"assets/cutouts/uparrow_sm.png",
                downArrowIcon:"assets/cutouts/downarrow_sm.png",
                refreshIcon:"assets/cutouts/refresh_sm.png",

                hintIcon:"Common/Shop/puzzleicon.png",
                zazzleIcon:"assets/cutouts/zazzleicon.png",
                zazzleBubble:"assets/cutouts/zazzlebubble.png",

                // Generic Dialog
                dialogBG:"assets/cutouts/popup_background.png",
                blackSquare:"assets/gfx_blackpixel_16x16.png",

                // Settings
                settingsBG: "assets/cutouts/popup_settings.jpg",
                btnTick: "assets/cutouts/btnTick2.png",
                logoutFBBtn: "assets/cutouts/imgPillBtn.png",
                iconCheck: "assets/cutouts/Icon_check.png",
                iconFacebook: "assets/cutouts/Icon_facebook.png",
                iconMusic: "assets/cutouts/Icon_music.png",
                iconSound: "assets/cutouts/Icon_sound.png",

                // Store
                storeItemBG:"assets/cutouts/store_indiv_bar.png",

                // Top Bar
                headerBG:"assets/topbar/Topbar_background.png",
                headerLeft:"assets/topbar/Topbar_left.png",
                headerRight:"assets/topbar/Topbar_right.png",
                headerSquare:"assets/topbar/Topbar_square.png",
                logo:"assets/title.png",
                energyIcon:"assets/cutouts/Puzzle_piece.png",
                timeMe_background:"assets/topbar/Time_me.png",
                timeOpp_background:"assets/topbar/Time_opp.png",
                timerBar:"assets/topbar/H_lines_2.png",

                // Active games
                activeCharacter:"assets/cutouts/Jig_character.png",
                speechIcon:"assets/cutouts/Puzzle_icon.png",

                // Turn
                turnBG:"assets/cutouts/turn_background.png",
                numberSheet:"assets/number_sheet.png",

                // Rate
                flagIcon:"assets/cutouts/flagicon.png",

                // Record Clip assets
                cameraBtn:"assets/cutouts/camerabutton.png",
                libraryBtn:"assets/cutouts/librarybutton.png",
                chooseIcon:"assets/cutouts/record_stockicon.png",

                // Send Clip assets
                sendMidBar:"assets/cutouts/sendvid_midbar.png",
                sendLowBar:"assets/cutouts/sendvid_lowbar.png",

                // Active Games
                darkStrip:"assets/cutouts/friendsplay_bar.png",
                lightStrip:"assets/cutouts/lightbar.png",
                editToggle:"assets/cutouts/edit_toggle.png",
                turnsCirc:"assets/turnsCirc.png",
                activeRefresh:"assets/cutouts/refresh_arrow.png",

                // Difficulty
                puzzleIcon:"assets/cutouts/puzzleicon.png",
                timeBkgd:"assets/cutouts/Time_backing.png",

                // Stock
                stockRound:"assets/cutouts/Round.png",
                stockRoundGrey:"assets/cutouts/Round_blk.png",
                stockRoundDimmer:"assets/cutouts/blk_overlay.png",
                stockPhotoBG:"assets/cutouts/Cate_bar.png",
                lockIcon:"assets/cutouts/Lock.png",
                coinMed:"Common/SharedAssets/Cashanova_med.png",

                // stock category icons... TODO: get from server, not embed in client
                stockIsland:"assets/cutouts/Stock_island.png",
                stockPuppy:"assets/cutouts/Stock_puppy.png",
                stockKitten:"assets/cutouts/Stock_kitten.png",

                // Slide puzzle
                slideBkgd1:"assets/cutouts/Slide_puzzle_unsolved.png",
                slideBkgd2:"assets/cutouts/Slide_puzzle_solved.png",

                // Cover flow
                smallCamera:"assets/cutouts/Camera_sml.png",
                coverFlowForward:"assets/cutouts/cover_forward.png",
                coverFlowBackward:"assets/cutouts/cover_backward.png",

                coverFlowIsland1:"assets/cutouts/coverflow_island1.png",
                coverFlowIsland2:"assets/cutouts/coverflow_island2.png",
                coverFlowIsland3:"assets/cutouts/coverflow_island3.png",
                coverFlowPuppy1:"assets/cutouts/coverflow_puppy1.png",
                coverFlowPuppy2:"assets/cutouts/coverflow_puppy2.png",
                coverFlowPuppy3:"assets/cutouts/coverflow_puppy3.png",
                coverFlowKitten1:"assets/cutouts/coverflow_kitten1.png",
                coverFlowKitten2:"assets/cutouts/coverflow_kitten2.png",
                coverFlowKitten3:"assets/cutouts/coverflow_kitten3.png",

                // PuzzlePix
                jigsaw_background:"assets/main_background.png",
                jigsaw_template16:"assets/PuzzlePix16_template.png",
                jigsaw_template16_data:{url: "assets/PuzzlePix16_template.json", optional:true},
                jigsaw_template30:"assets/PuzzlePix30_template.png",
                jigsaw_template30_data:{url: "assets/PuzzlePix30_template.json", optional:true},

                streakBonus:"assets/Streak_bonus.png",
                timeBonus:"assets/Time_bonus.png",
                fullStreak:"assets/Full_bonus.png",
                timeBonusFull:"assets/bonus_bar_full.png",
                timeBonusEmpty:"assets/bonus_bar.png",

                solveIcon:"assets/Solve_it.png",
                edgeIcon:"assets/Edge.png",
                picIcon:"assets/Pic.png",
                magnetIcon:"assets/Magnet.png",
                rotateIcon:"assets/Rotate.png",
                inviteIcon:"assets/Invite.png",

                // summary screen
                summaryBackground:"assets/summary/Background_reward.png",
                shareBanner:"assets/summary/Share_Banner.png",
                largeCoin:"Common/SharedAssets/Cashanova.png",
                earnBadge:"assets/summary/You_earned.png",
                streakBadge:"assets/summary/Streak_bonus.png",
                timeBadge:"assets/summary/Time_bonus.png",
                puzz1:"assets/summary/Puzz_1.png",
                puzz2:"assets/summary/Puzz_2.png",
                puzz3:"assets/summary/Puzz_3.png",

                // JSON
                mainLayout:"layouts/puzzlepix_main_view.json",
                subLayout:"layouts/puzzlepix_sub_view_" + g_game.platform + ".json",
                sliceMap:"assets/threeSliceMap.json",
                typeOneMap:"assets/typeOneSlice.json",
                typeOneMapExt:"assets/typeOneSliceExt.json",
                typeOneMapExtGrey:"assets/typeOneSliceExtGrey.json",
                typeTwoMap:"assets/typeTwoSlice.json",


                // audio
                buttonClick1:"Common/SharedAssets/button.mp3",
                buttonClick2:"Common/SharedAssets/toggle.mp3",
                completeSound:"assets/sounds/Puzzle_complete.mp3",
                correctPieceSound:"assets/sounds/Puzzle_place2.mp3",
                timeStreakSound:"assets/sounds/Puzzle_time_bonus.mp3",
                streakSound:"assets/sounds/Puzzle_5_streak.mp3",
                music: "assets/sounds/music.mp3"
            };

            return manifest;
        },

        _createStore : function()
        {
            var self = this;
            self.storeDialog = new (require('PuzzleStore').PuzzleStore)();
        },

        _initStore : function()
        {
            var self = this;
            var arSkus = [ "puzzleCategoriesButton", "themes", "hints", "money", 'puzzlePiece' ];
            self.storeDialog.init(self, arSkus);
        },

        _createTopBar : function()
        {
            var self = this;
            self.topBar = new (require('PuzzleTopBar').PuzzleTopBar)();
        },

        _createInventory : function()
        {
            var self = this;
            self.inventory = new (require('Inventory').Inventory)();
            self.inventory.init(self, "puzzlePiece");
        },

        gotoGame : function( gameId, errorCallback )
        {
            var self = this;

            if (self.clientConnection.game && self.clientConnection.game.id === gameId)
            {
                self._gotoGamePart2(self.clientConnection.game);
            }
            else
            {
                self.clientConnection.loadGame(gameId, function(err,game){
                    if (err)
                    {
                        console.log('Error fetching game in gotoGame');
                        errorCallback(err);
                    }
                    else
                    {
                        self._gotoGamePart2(game);
                    }
                });
            }
        },

        _gotoGamePart2 : function(game)
        {
            var self = this;

            // if still my turn
            if (!self.clientConnection.isMyTurn())
            {
                self.fsm.gotoState(self.GameStates.Main);
                return;
            }

            // reset top bar state
            self.topBar.setProfileInfo(self.clientConnection);
            self.topBar.setStatus("Playing With\n%s");

            // jump to needed game page
            switch(game.state.step)
            {
                case 'make':
                    self.fsm.gotoState(self.GameStates.Turn);
                    break;
                case 'selfDifficulty':
                    self.fsm.gotoState(self.GameStates.Difficulty, {'type' : 'self'});
                    break;
                case 'selfSolve':
                    self.fsm.gotoState(self.GameStates.PuzzleSolve, {'type' : 'self'});
                    break;
                case 'halfSummary':
                    self.fsm.gotoState(self.GameStates.Summary, {'type' : 'half'});
                    break;
                case 'prevSummary':
                    self.fsm.gotoState(self.GameStates.Summary, {'type' : 'prev'});
                    break;
                case 'oppDifficulty':
                    self.fsm.gotoState(self.GameStates.Turn);
                    break;
                case 'oppSolve':
                    self.fsm.gotoState(self.GameStates.PuzzleSolve, {'type' : 'opponent'});
                    break;
                case 'fullSummary':
                    self.fsm.gotoState(self.GameStates.Summary, {'type' : 'full'});
                    break;
            }
        }
    };

    extend(PuzzleGame, Game, null);

    exports.PuzzleGame = PuzzleGame;

})(typeof exports === 'undefined'? _modules['PuzzleGame']={} : exports);

var g_game = new (require('PuzzleGame').PuzzleGame)();
