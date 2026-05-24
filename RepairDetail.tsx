import { RepairItem } from './types';

export const INITIAL_PHONES: RepairItem[] = [
  {
    id: '1',
    model: 'Копия айфона',
    reason: 'без ремонта',
    date: '26.02.2026',
    contact: '89534553144',
    contact2: '',
    name: 'Иван',
    comment: 'Срочный заказ',
    status: 'active',
    price: 0,
    partsCost: 0
  },
  {
    id: '2',
    model: 'Honor 9c',
    reason: 'модуль в рамке',
    date: '04.03.2026',
    contact: '89991234567',
    contact2: '',
    name: 'Алексей',
    comment: 'Запчасть заказана',
    status: 'active',
    price: 3500,
    partsCost: 1500
  },
  {
    id: '3',
    model: 'Spark 20',
    reason: 'вода',
    date: '06.03.2026',
    contact: '89001112233',
    contact2: '',
    name: 'Дмитрий',
    comment: 'После залития, разобрать и почистить платы в ультразвуке',
    status: 'active',
    price: 2500,
    partsCost: 400
  },
  {
    id: '4',
    model: 'Колонка',
    reason: 'разъём питания',
    date: '12.05.2026',
    contact: '89123456789',
    contact2: '',
    name: 'Мария',
    comment: 'Замена гнезда Micro-USB',
    status: 'active',
    price: 1200,
    partsCost: 150
  }
];

export const INITIAL_ARCHIVE: RepairItem[] = [
  {
    id: 'arch1',
    model: 'Iphone 8',
    reason: 'Разобран клиентом, разорваны шлейфы, ни одного винта',
    date: '18.01.2025',
    contact: '89221112233',
    name: 'Сергей',
    status: 'archived',
    price: 4500,
    partsCost: 1200
  },
  {
    id: 'arch2',
    model: 'Redmi',
    reason: 'FRP',
    date: '20.01.2025',
    contact: '89332223344',
    name: 'Антон',
    status: 'archived',
    price: 1500,
    partsCost: 0
  },
  {
    id: 'arch3',
    model: 'A50',
    reason: 'модуль олед',
    date: '21.01.2025',
    contact: '89443334455',
    status: 'archived',
    price: 4000,
    partsCost: 1800
  },
  {
    id: 'arch4',
    model: 'a40',
    reason: 'нет сети',
    date: '22.01.2025',
    contact: '89554445566',
    status: 'archived',
    price: 2200,
    partsCost: 300
  },
  {
    id: 'arch5',
    model: 'Redmi 12',
    reason: 'дисплей ориг',
    date: '23.01.2025',
    contact: '89665556677',
    status: 'archived',
    price: 3800,
    partsCost: 1400
  },
  {
    id: 'arch6',
    model: 'A32',
    reason: 'Не заряд',
    date: '22.01.2025',
    contact: '89776667788',
    status: 'archived',
    price: 1800,
    partsCost: 200
  },
  {
    id: 'arch7',
    model: 'Realme',
    reason: 'кнопка вкл',
    date: '31.01.2025',
    contact: '89887778899',
    status: 'archived',
    price: 1200,
    partsCost: 100
  },
  {
    id: 'arch8',
    model: 'Филипс',
    reason: 'Замена аккумулятора',
    date: '31.01.2025',
    contact: '89998889900',
    status: 'archived',
    price: 1500,
    partsCost: 400
  },
  {
    id: 'arch9',
    model: 'Samsung Tab 4',
    reason: 'перезагрузка',
    date: '28.01.2025',
    contact: '89009990011',
    status: 'archived',
    price: 2800,
    partsCost: 500
  },
  {
    id: 'arch10',
    model: 'ZTE',
    reason: 'не вкл, прошивка',
    date: '27.01.2025',
    contact: '89110001122',
    status: 'archived',
    price: 1500,
    partsCost: 0
  },
  {
    id: 'arch11',
    model: 'Hot 12 pro',
    reason: 'модуль ориг',
    date: '03.02.2025',
    contact: '89221112233',
    status: 'archived',
    price: 4200,
    partsCost: 1600
  },
  {
    id: 'arch12',
    model: 'Honor 6c pro',
    reason: 'FRP',
    date: '03.02.2025',
    contact: '89332223344',
    status: 'archived',
    price: 1200,
    partsCost: 0
  },
  {
    id: 'arch13',
    model: 'Honor 8x',
    reason: 'модуль',
    date: '03.02.2025',
    contact: '89443334455',
    status: 'archived',
    price: 3500,
    partsCost: 1300
  },
  {
    id: 'arch14',
    model: 'Iphone 14 pro',
    reason: 'не вкл, нет винтиков снизу, крышка расколота',
    date: '29.01.2025',
    contact: '89554445566',
    status: 'archived',
    price: 8500,
    partsCost: 3000
  },
  {
    id: 'arch15',
    model: 'Колонка',
    reason: 'разъём',
    date: '03.02.2025',
    contact: '89665556677',
    status: 'archived',
    price: 1000,
    partsCost: 100
  }
];

export const INITIAL_PARTS = `8524 разъемы
ирфоны черные
радиоприёмник
P smart 2021 стекло камеры + нижняя плата 500/1500 р. 892286127323
y8p стекло камеры 89228653148 (100\\400)
Крышка 12 pro plus 5G 1000 / 2500 р. 89228610735
геймпад с курками
айфон 14 антишпион
Xiaomi 11 Lite 5G NE крышка задняя 500/700 р. 89969243724
3.5 на 2рца 5 м
Клава с подсветкой
wifi адаптер 5g
a207 a20s средняя часть корпуса, шлейф кнопок 89867912659 (1000 р. не брал)
Разъёмы алкатель
а31 крышка белая 89878609342
P smart 2021 стекло камеры 89058188408 200 р.
Разъем vivo y71
USB 128 Gb
Микро 128 гб
3rca 1.5m
АКБ АА 4 шт. по 1000 мАч
Трансмиттер
стекло y8p
Стекло nova 14i
Большие уши ПК
БП 6в 1А
Подставки
Кабель 100 ватт`;
