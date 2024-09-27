export default {
	"TV": {
		"Settings": {
			"Switch": true,
			"Third-Party": false,
			"HLSUrl": "play-edge.itunes.apple.com",
			"ServerUrl": "play.itunes.apple.com",
			"Tabs": ["WatchNow", "Originals", "MLS", "Sports", "Kids", "Store", "Movies", "TV", "ChannelsAndApps", "Library", "Search"],
			"CountryCode": { "Configs": "AUTO", "Settings": "AUTO", "View": ["SG", "TW"], "WatchNow": "AUTO", "Channels": "AUTO", "Originals": "AUTO", "Sports": "US", "Kids": "US", "Store": "AUTO", "Movies": "AUTO", "TV": "AUTO", "Persons": "SG", "Search": "AUTO", "Others": "AUTO" }
		},
		"Configs": {
			"Locale": [
				["AU", "en-AU"],
				["CA", "en-CA"],
				["GB", "en-GB"],
				["KR", "ko-KR"],
				["HK", "yue-Hant"],
				["JP", "ja-JP"],
				["MO", "zh-Hant"],
				["TW", "zh-Hant"],
				["US", "en-US"],
				["SG", "zh-Hans"]
			],
			"Tabs": [
				{ "title": "主页", "type": "WatchNow", "universalLinks": ["https://tv.apple.com/watch-now", "https://tv.apple.com/home"], "destinationType": "Target", "target": { "id": "tahoma_watchnow", "type": "Root", "url": "https://tv.apple.com/watch-now" }, "isSelected": true },
				{ "title": "Apple TV+", "type": "Originals", "universalLinks": ["https://tv.apple.com/channel/tvs.sbd.4000", "https://tv.apple.com/atv"], "destinationType": "Target", "target": { "id": "tvs.sbd.4000", "type": "Brand", "url": "https://tv.apple.com/us/channel/tvs.sbd.4000" } },
				{ "title": "MLS Season Pass", "type": "MLS", "universalLinks": ["https://tv.apple.com/mls"], "destinationType": "Target", "target": { "id": "tvs.sbd.7000", "type": "Brand", "url": "https://tv.apple.com/us/channel/tvs.sbd.7000" } },
				{ "title": "体育节目", "type": "Sports", "universalLinks": ["https://tv.apple.com/sports"], "destinationType": "Target", "target": { "id": "tahoma_sports", "type": "Root", "url": "https://tv.apple.com/sports" } },
				{ "title": "儿童", "type": "Kids", "universalLinks": ["https://tv.apple.com/kids"], "destinationType": "Target", "target": { "id": "tahoma_kids", "type": "Root", "url": "https://tv.apple.com/kids" } },
				{ "title": "电影", "type": "Movies", "universalLinks": ["https://tv.apple.com/movies"], "destinationType": "Target", "target": { "id": "tahoma_movies", "type": "Root", "url": "https://tv.apple.com/movies" } },
				{ "title": "电视节目", "type": "TV", "universalLinks": ["https://tv.apple.com/tv-shows"], "destinationType": "Target", "target": { "id": "tahoma_tvshows", "type": "Root", "url": "https://tv.apple.com/tv-shows" } },
				{
					"title": "商店",
					"type": "Store",
					"universalLinks": ["https://tv.apple.com/store"],
					"destinationType": "SubTabs",
					"subTabs": [
						{ "title": "电影", "type": "Movies", "universalLinks": ["https://tv.apple.com/movies"], "destinationType": "Target", "target": { "id": "tahoma_movies", "type": "Root", "url": "https://tv.apple.com/movies" } },
						{ "title": "电视节目", "type": "TV", "universalLinks": ["https://tv.apple.com/tv-shows"], "destinationType": "Target", "target": { "id": "tahoma_tvshows", "type": "Root", "url": "https://tv.apple.com/tv-shows" } }
					]
				},
				{
					"title": "频道和 App",
					"destinationType": "SubTabs",
					"subTabsPlacementType": "ExpandedList",
					"type": "ChannelsAndApps",
					"subTabs": []
				},
				{ "title": "资料库", "type": "Library", "destinationType": "Client" },
				{ "title": "搜索", "type": "Search", "universalLinks": ["https://tv.apple.com/search"], "destinationType": "Target", "target": { "id": "tahoma_search", "type": "Root", "url": "https://tv.apple.com/search" } }
			],
			"i18n": {
				"WatchNow": [
					["en", "Home"],
					["zh", "主页"],
					["zh-Hans", "主頁"],
					["zh-Hant", "主頁"]
				],
				"Movies": [
					["en", "Movies"],
					["zh", "电影"],
					["zh-Hans", "电影"],
					["zh-Hant", "電影"]
				],
				"TV": [
					["en", "TV"],
					["zh", "电视节目"],
					["zh-Hans", "电视节目"],
					["zh-Hant", "電視節目"]
				],
				"Store": [
					["en", "Store"],
					["zh", "商店"],
					["zh-Hans", "商店"],
					["zh-Hant", "商店"]
				],
				"Sports": [
					["en", "Sports"],
					["zh", "体育节目"],
					["zh-Hans", "体育节目"],
					["zh-Hant", "體育節目"]
				],
				"Kids": [
					["en", "Kids"],
					["zh", "儿童"],
					["zh-Hans", "儿童"],
					["zh-Hant", "兒童"]
				],
				"Library": [
					["en", "Library"],
					["zh", "资料库"],
					["zh-Hans", "资料库"],
					["zh-Hant", "資料庫"]
				],
				"Search": [
					["en", "Search"],
					["zh", "搜索"],
					["zh-Hans", "搜索"],
					["zh-Hant", "蒐索"]
				]
			},
			"Storefront": {"AE":"143481","AF":"143610","AG":"143540","AI":"143538","AL":"143575","AM":"143524","AO":"143564","AR":"143505","AT":"143445","AU":"143460","AZ":"143568","BA":"143612","BB":"143541","BD":"143490","BE":"143446","BF":"143578","BG":"143526","BH":"143559","BJ":"143576","BM":"143542","BN":"143560","BO":"143556","BR":"143503","BS":"143539","BT":"143577","BW":"143525","BY":"143565","BZ":"143555","CA":"143455","CD":"143613","CG":"143582","CH":"143459","CI":"143527","CL":"143483","CM":"143574","CN":"143465","CO":"143501","CR":"143495","CV":"143580","CY":"143557","CZ":"143489","DE":"143443","DK":"143458","DM":"143545","DO":"143508","DZ":"143563","EC":"143509","EE":"143518","EG":"143516","ES":"143454","FI":"143447","FJ":"143583","FM":"143591","FR":"143442","GA":"143614","GB":"143444","GD":"143546","GF":"143615","GH":"143573","GM":"143584","GR":"143448","GT":"143504","GW":"143585","GY":"143553","HK":"143463","HN":"143510","HR":"143494","HU":"143482","ID":"143476","IE":"143449","IL":"143491","IN":"143467","IQ":"143617","IS":"143558","IT":"143450","JM":"143511","JO":"143528","JP":"143462","KE":"143529","KG":"143586","KH":"143579","KN":"143548","KP":"143466","KR":"143466","KW":"143493","KY":"143544","KZ":"143517","TC":"143552","TD":"143581","TJ":"143603","TH":"143475","TM":"143604","TN":"143536","TO":"143608","TR":"143480","TT":"143551","TW":"143470","TZ":"143572","LA":"143587","LB":"143497","LC":"143549","LI":"143522","LK":"143486","LR":"143588","LT":"143520","LU":"143451","LV":"143519","LY":"143567","MA":"143620","MD":"143523","ME":"143619","MG":"143531","MK":"143530","ML":"143532","MM":"143570","MN":"143592","MO":"143515","MR":"143590","MS":"143547","MT":"143521","MU":"143533","MV":"143488","MW":"143589","MX":"143468","MY":"143473","MZ":"143593","NA":"143594","NE":"143534","NG":"143561","NI":"143512","NL":"143452","NO":"143457","NP":"143484","NR":"143606","NZ":"143461","OM":"143562","PA":"143485","PE":"143507","PG":"143597","PH":"143474","PK":"143477","PL":"143478","PT":"143453","PW":"143595","PY":"143513","QA":"143498","RO":"143487","RS":"143500","RU":"143469","RW":"143621","SA":"143479","SB":"143601","SC":"143599","SE":"143456","SG":"143464","SI":"143499","SK":"143496","SL":"143600","SN":"143535","SR":"143554","ST":"143598","SV":"143506","SZ":"143602","UA":"143492","UG":"143537","US":"143441","UY":"143514","UZ":"143566","VC":"143550","VE":"143502","VG":"143543","VN":"143471","VU":"143609","XK":"143624","YE":"143571","ZA":"143472","ZM":"143622","ZW":"143605"}
		}
	}
}
