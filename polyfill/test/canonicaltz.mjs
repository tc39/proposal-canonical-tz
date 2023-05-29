import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { equal, throws } = assert;

import * as Temporal from '../lib/temporal.mjs';
import { DateTimeFormat } from '../lib/intl.mjs';
Intl.DateTimeFormat = DateTimeFormat;

describe('Time Zone Canonicalization (proposal-canonical-tz)', () => {
  describe('TimeZone constructor', () => {
    it('Time zone IDs are not canonicalized', () => {
      const calcutta = new Temporal.TimeZone('Asia/Calcutta');
      const kolkata = new Temporal.TimeZone('Asia/Kolkata');

      equal(calcutta.toString(), 'Asia/Calcutta');
      equal(calcutta.toJSON(), 'Asia/Calcutta');
      equal(calcutta.id, 'Asia/Calcutta');

      equal(kolkata.toString(), 'Asia/Kolkata');
      equal(kolkata.toJSON(), 'Asia/Kolkata');
      equal(kolkata.id, 'Asia/Kolkata');
    });

    it('Case-normalizes (but does not canonicalize) time zone IDs', () => {
      const ids = [...new Set([...timeZoneIdentifiers, ...Intl.supportedValuesOf('timeZone')])];
      for (const id of ids) {
        const lower = id.toLowerCase();
        const upper = id.toUpperCase();
        equal(new Temporal.TimeZone(id).toString(), id);
        equal(new Temporal.TimeZone(upper).toString(), id);
        equal(new Temporal.TimeZone(lower).toString(), id);
      }
    });
  });
  describe('TimeZone.p.equals', () => {
    it('Canonicalizes to evaluate time zone equality', () => {
      const neverEqual = new Temporal.TimeZone('Asia/Tokyo');
      const zdt = new Temporal.ZonedDateTime(0n, 'America/Los_Angeles');
      const ids = [
        ['America/Atka', 'America/Adak'],
        ['America/Knox_IN', 'America/Indiana/Knox'],
        ['Asia/Ashkhabad', 'Asia/Ashgabat'],
        ['Asia/Dacca', 'Asia/Dhaka'],
        ['Asia/Istanbul', 'Europe/Istanbul'],
        ['Asia/Macao', 'Asia/Macau'],
        ['Asia/Thimbu', 'Asia/Thimphu'],
        ['Asia/Ujung_Pandang', 'Asia/Makassar'],
        ['Asia/Ulan_Bator', 'Asia/Ulaanbaatar']
      ];

      for (const [identifier, primaryIdentifier] of ids) {
        const tz1 = new Temporal.TimeZone(identifier);
        const tz2 = new Temporal.TimeZone(primaryIdentifier);

        // compare objects
        equal(tz1.equals(tz2), true);
        equal(tz2.equals(tz1), true);
        equal(tz1.equals(neverEqual), false);

        // compare string IDs
        equal(tz1.equals(tz2.id), true);
        equal(tz2.equals(tz1.id), true);
        equal(tz1.equals(neverEqual.id), false);

        // compare ZonedDateTime instances
        equal(tz1.equals(zdt.withTimeZone(tz2)), true);
        equal(tz2.equals(zdt.withTimeZone(tz1)), true);
        equal(tz1.equals(zdt.withTimeZone(neverEqual)), false);

        // compare IXDTF strings
        equal(tz1.equals(zdt.withTimeZone(tz2).toString()), true);
        equal(tz2.equals(zdt.withTimeZone(tz1).toString()), true);
        equal(tz1.equals(zdt.withTimeZone(neverEqual).toString()), false);
      }
    });
    it('Offset strings are canonicalized', () => {
      const otz1 = new Temporal.TimeZone('+05:30:00.000');
      equal(otz1.id, '+05:30');
      const otz2 = new Temporal.TimeZone('+05:30:00.000000001');
      equal(otz2.id, '+05:30:00.000000001');
      throws(() => new Temporal.TimeZone('+05:30:00.0000000001'), RangeError);
    });
    it('Offset string time zones compare as expected', () => {
      const zdt = new Temporal.ZonedDateTime(0n, 'America/Los_Angeles');
      const otz1 = new Temporal.TimeZone('+05:30');
      const otz2 = new Temporal.TimeZone('+05:30:00.000');
      const tz = new Temporal.TimeZone('Asia/Kolkata');
      equal(otz1.equals(otz2), true);
      equal(otz2.equals(otz1), true);
      equal(otz1.equals('+05:30:00.000'), true);
      equal(otz1.equals(zdt.withTimeZone(otz2)), true);
      equal(otz1.equals(zdt.withTimeZone(otz2).toString()), true);
      equal(otz1.equals(tz), false);
      equal(otz1.equals('Asia/Kolkata'), false);
      equal(otz1.equals(zdt.withTimeZone(tz)), false);
      equal(otz1.equals(zdt.withTimeZone(tz).toString()), false);
    });
  });
  describe('ZonedDateTime', () => {
    it('ZonedDateTime constructor does not canonicalize time zone IDs', () => {
      const calcutta = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      const kolkata = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Kolkata]');

      equal(calcutta.toString(), '2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      equal(calcutta.toJSON(), '2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      equal(calcutta.timeZoneId, 'Asia/Calcutta');

      equal(kolkata.toString(), '2020-01-01T00:00:00+05:30[Asia/Kolkata]');
      equal(kolkata.toJSON(), '2020-01-01T00:00:00+05:30[Asia/Kolkata]');
      equal(kolkata.timeZoneId, 'Asia/Kolkata');
    });

    it('ZonedDateTim.p.until accepts time zones that canonicalize to the same ID', () => {
      const calcutta = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      const kolkata = Temporal.ZonedDateTime.from('2021-09-01T00:00:00+05:30[Asia/Kolkata]');
      const colombo = Temporal.ZonedDateTime.from('2022-08-01T00:00:00+05:30[Asia/Colombo]');

      // If the time zones resolve to the same canonical zone, then it shouldn't throw
      equal(calcutta.until(kolkata, { largestUnit: 'day' }).toString(), 'P609D');
      throws(() => calcutta.until(colombo, { largestUnit: 'day' }), RangeError);
    });

    it('ZonedDateTim.p.since accepts time zones that canonicalize to the same ID', () => {
      const calcutta = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      const kolkata = Temporal.ZonedDateTime.from('2021-09-01T00:00:00+05:30[Asia/Kolkata]');
      const colombo = Temporal.ZonedDateTime.from('2022-08-01T00:00:00+05:30[Asia/Colombo]');

      // If the time zones resolve to the same canonical zone, then it shouldn't throw
      equal(calcutta.since(kolkata, { largestUnit: 'day' }).toString(), '-P609D');
      throws(() => calcutta.since(colombo, { largestUnit: 'day' }), RangeError);
    });

    it('ZonedDateTime.p.equals canonicalizes time zone IDs', () => {
      const calcutta = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Calcutta]');
      const kolkata = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Kolkata]');
      const colombo = Temporal.ZonedDateTime.from('2020-01-01T00:00:00+05:30[Asia/Colombo]');

      equal(calcutta.equals(kolkata), true);
      equal(calcutta.equals(kolkata.toString()), true);
      equal(kolkata.equals(calcutta), true);
      equal(kolkata.equals(calcutta.toString()), true);
      equal(calcutta.equals(colombo), false);
    });
  });

  describe('Intl.DateTimeFormat', () => {
    it('Intl.DateTimeFormat constructor does not canonicalize time zone IDs', () => {
      const baseOptions = {
        timeZoneName: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      };
      const dtf1 = new Intl.DateTimeFormat('en', { ...baseOptions, timeZone: 'Asia/Calcutta' });
      const dtf2 = new Intl.DateTimeFormat('en', { ...baseOptions, timeZone: 'Asia/Kolkata' });

      const resolvedId1 = dtf1.resolvedOptions().timeZone;
      const resolvedId2 = dtf2.resolvedOptions().timeZone;

      const output1 = dtf1.format(0);
      const output2 = dtf2.format(0);

      equal(output1, output2);
      equal(resolvedId1, 'Asia/Calcutta');
      equal(resolvedId2, 'Asia/Kolkata');
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}

const timeZoneIdentifiers = [
  'Africa/Abidjan',
  'Africa/Algiers',
  'Africa/Bissau',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Ceuta',
  'Africa/El_Aaiun',
  'Africa/Johannesburg',
  'Africa/Juba',
  'Africa/Khartoum',
  'Africa/Lagos',
  'Africa/Maputo',
  'Africa/Monrovia',
  'Africa/Nairobi',
  'Africa/Ndjamena',
  'Africa/Sao_Tome',
  'Africa/Tripoli',
  'Africa/Tunis',
  'Africa/Windhoek',
  'America/Adak',
  'America/Anchorage',
  'America/Araguaina',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Catamarca',
  'America/Argentina/Cordoba',
  'America/Argentina/Jujuy',
  'America/Argentina/La_Rioja',
  'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Salta',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
  'America/Asuncion',
  'America/Bahia',
  'America/Bahia_Banderas',
  'America/Barbados',
  'America/Belem',
  'America/Belize',
  'America/Boa_Vista',
  'America/Bogota',
  'America/Boise',
  'America/Cambridge_Bay',
  'America/Campo_Grande',
  'America/Cancun',
  'America/Caracas',
  'America/Cayenne',
  'America/Chicago',
  'America/Chihuahua',
  // 'America/Ciudad_Juarez',
  'America/Costa_Rica',
  'America/Cuiaba',
  'America/Danmarkshavn',
  'America/Dawson',
  'America/Dawson_Creek',
  'America/Denver',
  'America/Detroit',
  'America/Edmonton',
  'America/Eirunepe',
  'America/El_Salvador',
  'America/Fort_Nelson',
  'America/Fortaleza',
  'America/Glace_Bay',
  'America/Goose_Bay',
  'America/Grand_Turk',
  'America/Guatemala',
  'America/Guayaquil',
  'America/Guyana',
  'America/Halifax',
  'America/Havana',
  'America/Hermosillo',
  'America/Indiana/Indianapolis',
  'America/Indiana/Knox',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Tell_City',
  'America/Indiana/Vevay',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Inuvik',
  'America/Iqaluit',
  'America/Jamaica',
  'America/Juneau',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/La_Paz',
  'America/Lima',
  'America/Los_Angeles',
  'America/Maceio',
  'America/Managua',
  'America/Manaus',
  'America/Martinique',
  'America/Matamoros',
  'America/Mazatlan',
  'America/Menominee',
  'America/Merida',
  'America/Metlakatla',
  'America/Mexico_City',
  'America/Miquelon',
  'America/Moncton',
  'America/Monterrey',
  'America/Montevideo',
  'America/New_York',
  'America/Nome',
  'America/Noronha',
  'America/North_Dakota/Beulah',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/Nuuk',
  'America/Ojinaga',
  'America/Panama',
  'America/Paramaribo',
  'America/Phoenix',
  'America/Port-au-Prince',
  'America/Porto_Velho',
  'America/Puerto_Rico',
  'America/Punta_Arenas',
  'America/Rankin_Inlet',
  'America/Recife',
  'America/Regina',
  'America/Resolute',
  'America/Rio_Branco',
  'America/Santarem',
  'America/Santiago',
  'America/Santo_Domingo',
  'America/Sao_Paulo',
  'America/Scoresbysund',
  'America/Sitka',
  'America/St_Johns',
  'America/Swift_Current',
  'America/Tegucigalpa',
  'America/Thule',
  'America/Tijuana',
  'America/Toronto',
  'America/Vancouver',
  'America/Whitehorse',
  'America/Winnipeg',
  'America/Yakutat',
  'America/Yellowknife',
  'Antarctica/Casey',
  'Antarctica/Davis',
  'Antarctica/Macquarie',
  'Antarctica/Mawson',
  'Antarctica/Palmer',
  'Antarctica/Rothera',
  'Antarctica/Troll',
  'Asia/Almaty',
  'Asia/Amman',
  'Asia/Anadyr',
  'Asia/Aqtau',
  'Asia/Aqtobe',
  'Asia/Ashgabat',
  'Asia/Atyrau',
  'Asia/Baghdad',
  'Asia/Baku',
  'Asia/Bangkok',
  'Asia/Barnaul',
  'Asia/Beirut',
  'Asia/Bishkek',
  'Asia/Chita',
  'Asia/Choibalsan',
  'Asia/Colombo',
  'Asia/Damascus',
  'Asia/Dhaka',
  'Asia/Dili',
  'Asia/Dubai',
  'Asia/Dushanbe',
  'Asia/Famagusta',
  'Asia/Gaza',
  'Asia/Hebron',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Hovd',
  'Asia/Irkutsk',
  'Asia/Jakarta',
  'Asia/Jayapura',
  'Asia/Jerusalem',
  'Asia/Kabul',
  'Asia/Kamchatka',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Khandyga',
  'Asia/Kolkata',
  'Asia/Krasnoyarsk',
  'Asia/Kuching',
  'Asia/Macau',
  'Asia/Magadan',
  'Asia/Makassar',
  'Asia/Manila',
  'Asia/Nicosia',
  'Asia/Novokuznetsk',
  'Asia/Novosibirsk',
  'Asia/Omsk',
  'Asia/Oral',
  'Asia/Pontianak',
  'Asia/Pyongyang',
  'Asia/Qatar',
  'Asia/Qostanay',
  'Asia/Qyzylorda',
  'Asia/Riyadh',
  'Asia/Sakhalin',
  'Asia/Samarkand',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Srednekolymsk',
  'Asia/Taipei',
  'Asia/Tashkent',
  'Asia/Tbilisi',
  'Asia/Tehran',
  'Asia/Thimphu',
  'Asia/Tokyo',
  'Asia/Tomsk',
  'Asia/Ulaanbaatar',
  'Asia/Urumqi',
  'Asia/Ust-Nera',
  'Asia/Vladivostok',
  'Asia/Yakutsk',
  'Asia/Yangon',
  'Asia/Yekaterinburg',
  'Asia/Yerevan',
  'Atlantic/Azores',
  'Atlantic/Bermuda',
  'Atlantic/Canary',
  'Atlantic/Cape_Verde',
  'Atlantic/Faroe',
  'Atlantic/Madeira',
  'Atlantic/South_Georgia',
  'Atlantic/Stanley',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Broken_Hill',
  'Australia/Darwin',
  'Australia/Eucla',
  'Australia/Hobart',
  'Australia/Lindeman',
  'Australia/Lord_Howe',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'CET',
  'CST6CDT',
  'EET',
  'EST',
  'EST5EDT',
  'Etc/GMT',
  'Etc/GMT+1',
  'Etc/GMT+10',
  'Etc/GMT+11',
  'Etc/GMT+12',
  'Etc/GMT+2',
  'Etc/GMT+3',
  'Etc/GMT+4',
  'Etc/GMT+5',
  'Etc/GMT+6',
  'Etc/GMT+7',
  'Etc/GMT+8',
  'Etc/GMT+9',
  'Etc/GMT-1',
  'Etc/GMT-10',
  'Etc/GMT-11',
  'Etc/GMT-12',
  'Etc/GMT-13',
  'Etc/GMT-14',
  'Etc/GMT-2',
  'Etc/GMT-3',
  'Etc/GMT-4',
  'Etc/GMT-5',
  'Etc/GMT-6',
  'Etc/GMT-7',
  'Etc/GMT-8',
  'Etc/GMT-9',
  'Etc/UTC',
  'Europe/Andorra',
  'Europe/Astrakhan',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Chisinau',
  'Europe/Dublin',
  'Europe/Gibraltar',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Kaliningrad',
  'Europe/Kirov',
  'Europe/Kyiv',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Minsk',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Samara',
  'Europe/Saratov',
  'Europe/Simferopol',
  'Europe/Sofia',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Ulyanovsk',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Volgograd',
  'Europe/Warsaw',
  'Europe/Zurich',
  'HST',
  'Indian/Chagos',
  'Indian/Maldives',
  'Indian/Mauritius',
  'MET',
  'MST',
  'MST7MDT',
  'PST8PDT',
  'Pacific/Apia',
  'Pacific/Auckland',
  'Pacific/Bougainville',
  'Pacific/Chatham',
  'Pacific/Easter',
  'Pacific/Efate',
  'Pacific/Fakaofo',
  'Pacific/Fiji',
  'Pacific/Galapagos',
  'Pacific/Gambier',
  'Pacific/Guadalcanal',
  'Pacific/Guam',
  'Pacific/Honolulu',
  'Pacific/Kanton',
  'Pacific/Kiritimati',
  'Pacific/Kosrae',
  'Pacific/Kwajalein',
  'Pacific/Marquesas',
  'Pacific/Nauru',
  'Pacific/Niue',
  'Pacific/Norfolk',
  'Pacific/Noumea',
  'Pacific/Pago_Pago',
  'Pacific/Palau',
  'Pacific/Pitcairn',
  'Pacific/Port_Moresby',
  'Pacific/Rarotonga',
  'Pacific/Tahiti',
  'Pacific/Tarawa',
  'Pacific/Tongatapu',
  'WET',
  'Africa/Accra',
  'Africa/Addis_Ababa',
  'Africa/Asmara',
  'Africa/Asmera',
  'Africa/Bamako',
  'Africa/Bangui',
  'Africa/Banjul',
  'Africa/Blantyre',
  'Africa/Brazzaville',
  'Africa/Bujumbura',
  'Africa/Conakry',
  'Africa/Dakar',
  'Africa/Dar_es_Salaam',
  'Africa/Djibouti',
  'Africa/Douala',
  'Africa/Freetown',
  'Africa/Gaborone',
  'Africa/Harare',
  'Africa/Kampala',
  'Africa/Kigali',
  'Africa/Kinshasa',
  'Africa/Libreville',
  'Africa/Lome',
  'Africa/Luanda',
  'Africa/Lubumbashi',
  'Africa/Lusaka',
  'Africa/Malabo',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Mogadishu',
  'Africa/Niamey',
  'Africa/Nouakchott',
  'Africa/Ouagadougou',
  'Africa/Porto-Novo',
  'Africa/Timbuktu',
  'America/Anguilla',
  'America/Antigua',
  'America/Argentina/ComodRivadavia',
  'America/Aruba',
  'America/Atikokan',
  'America/Atka',
  'America/Blanc-Sablon',
  'America/Buenos_Aires',
  'America/Catamarca',
  'America/Cayman',
  'America/Coral_Harbour',
  'America/Cordoba',
  'America/Creston',
  'America/Curacao',
  'America/Dominica',
  'America/Ensenada',
  'America/Fort_Wayne',
  'America/Godthab',
  'America/Grenada',
  'America/Guadeloupe',
  'America/Indianapolis',
  'America/Jujuy',
  'America/Knox_IN',
  'America/Kralendijk',
  'America/Louisville',
  'America/Lower_Princes',
  'America/Marigot',
  'America/Mendoza',
  'America/Montreal',
  'America/Montserrat',
  'America/Nassau',
  'America/Nipigon',
  'America/Pangnirtung',
  'America/Port_of_Spain',
  'America/Porto_Acre',
  'America/Rainy_River',
  'America/Rosario',
  'America/Santa_Isabel',
  'America/Shiprock',
  'America/St_Barthelemy',
  'America/St_Kitts',
  'America/St_Lucia',
  'America/St_Thomas',
  'America/St_Vincent',
  'America/Thunder_Bay',
  'America/Tortola',
  'America/Virgin',
  'Antarctica/DumontDUrville',
  'Antarctica/McMurdo',
  'Antarctica/South_Pole',
  'Antarctica/Syowa',
  'Antarctica/Vostok',
  'Arctic/Longyearbyen',
  'Asia/Aden',
  'Asia/Ashkhabad',
  'Asia/Bahrain',
  'Asia/Brunei',
  'Asia/Calcutta',
  'Asia/Chongqing',
  'Asia/Chungking',
  'Asia/Dacca',
  'Asia/Harbin',
  'Asia/Istanbul',
  'Asia/Kashgar',
  'Asia/Katmandu',
  'Asia/Kuala_Lumpur',
  'Asia/Kuwait',
  'Asia/Macao',
  'Asia/Muscat',
  'Asia/Phnom_Penh',
  'Asia/Rangoon',
  'Asia/Saigon',
  'Asia/Tel_Aviv',
  'Asia/Thimbu',
  'Asia/Ujung_Pandang',
  'Asia/Ulan_Bator',
  'Asia/Vientiane',
  'Atlantic/Faeroe',
  'Atlantic/Jan_Mayen',
  'Atlantic/Reykjavik',
  'Atlantic/St_Helena',
  'Australia/ACT',
  'Australia/Canberra',
  'Australia/Currie',
  'Australia/LHI',
  'Australia/NSW',
  'Australia/North',
  'Australia/Queensland',
  'Australia/South',
  'Australia/Tasmania',
  'Australia/Victoria',
  'Australia/West',
  'Australia/Yancowinna',
  'Brazil/Acre',
  'Brazil/DeNoronha',
  'Brazil/East',
  'Brazil/West',
  'Canada/Atlantic',
  'Canada/Central',
  'Canada/Eastern',
  'Canada/Mountain',
  'Canada/Newfoundland',
  'Canada/Pacific',
  'Canada/Saskatchewan',
  'Canada/Yukon',
  'Chile/Continental',
  'Chile/EasterIsland',
  'Cuba',
  'Egypt',
  'Eire',
  'Etc/GMT+0',
  'Etc/GMT-0',
  'Etc/GMT0',
  'Etc/Greenwich',
  'Etc/UCT',
  'Etc/Universal',
  'Etc/Zulu',
  'Europe/Amsterdam',
  'Europe/Belfast',
  'Europe/Bratislava',
  'Europe/Busingen',
  'Europe/Copenhagen',
  'Europe/Guernsey',
  'Europe/Isle_of_Man',
  'Europe/Jersey',
  'Europe/Kiev',
  'Europe/Ljubljana',
  'Europe/Luxembourg',
  'Europe/Mariehamn',
  'Europe/Monaco',
  'Europe/Nicosia',
  'Europe/Oslo',
  'Europe/Podgorica',
  'Europe/San_Marino',
  'Europe/Sarajevo',
  'Europe/Skopje',
  'Europe/Stockholm',
  'Europe/Tiraspol',
  'Europe/Uzhgorod',
  'Europe/Vaduz',
  'Europe/Vatican',
  'Europe/Zagreb',
  'Europe/Zaporozhye',
  'GB',
  'GB-Eire',
  'GMT',
  'GMT+0',
  'GMT-0',
  'GMT0',
  'Greenwich',
  'Hongkong',
  'Iceland',
  'Indian/Antananarivo',
  'Indian/Christmas',
  'Indian/Cocos',
  'Indian/Comoro',
  'Indian/Kerguelen',
  'Indian/Mahe',
  'Indian/Mayotte',
  'Indian/Reunion',
  'Iran',
  'Israel',
  'Jamaica',
  'Japan',
  'Kwajalein',
  'Libya',
  'Mexico/BajaNorte',
  'Mexico/BajaSur',
  'Mexico/General',
  'NZ',
  'NZ-CHAT',
  'Navajo',
  'PRC',
  'Pacific/Chuuk',
  'Pacific/Enderbury',
  'Pacific/Funafuti',
  'Pacific/Johnston',
  'Pacific/Majuro',
  'Pacific/Midway',
  'Pacific/Pohnpei',
  'Pacific/Ponape',
  'Pacific/Saipan',
  'Pacific/Samoa',
  'Pacific/Truk',
  'Pacific/Wake',
  'Pacific/Wallis',
  'Pacific/Yap',
  'Poland',
  'Portugal',
  'ROC',
  'ROK',
  'Singapore',
  'Turkey',
  'UCT',
  'US/Alaska',
  'US/Aleutian',
  'US/Arizona',
  'US/Central',
  'US/East-Indiana',
  'US/Eastern',
  'US/Hawaii',
  'US/Indiana-Starke',
  'US/Michigan',
  'US/Mountain',
  'US/Pacific',
  'US/Pacific-New',
  'US/Samoa',
  'UTC',
  'Universal',
  'W-SU',
  'Zulu'
];
