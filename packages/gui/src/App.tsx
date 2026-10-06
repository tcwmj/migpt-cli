import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './apis.ts'
import type {
  Account,
  BindingRow,
  DeviceDetail,
  DeviceRow,
  LogEntry,
  PulledDevice,
  Role,
  Room,
  SpeakerModel,
  ThinkService,
  VoiceService,
} from './apis.ts'
import roomImg from './assets/speaker-room.jpg'
import livingImg from './assets/scene-living.jpg'
import studyImg from './assets/scene-study.jpg'
import closeImg from './assets/speaker-close.jpg'
import heroImg from './assets/speaker-hero-multi.jpg'
import modelsImg from './assets/model-stack.jpg'
import bannerHomeImg from './assets/banner-home.jpg'
import bannerBedroomImg from './assets/banner-bedroom.jpg'
import bannerStudyImg from './assets/banner-study.jpg'
import bannerKitchenImg from './assets/banner-kitchen.jpg'
import bannerBalconyImg from './assets/banner-balcony.jpg'
import robotImg from './assets/avatar-robot.jpg'
import girlImg from './assets/avatar-girl.jpg'
import catImg from './assets/avatar-cat.jpg'
import roleImg from './assets/kpi-role.jpg'
import voiceImg from './assets/kpi-voice.jpg'

/* ══ Phosphor 图标（设计稿同源） ══ */
const P: Record<string, string> = {
  speaker:
    'M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z',
  home: 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
  user:
    'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
  chat: 'M216,48H40A16,16,0,0,0,24,64V224a15.84,15.84,0,0,0,9.25,14.5A16.05,16.05,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,224h0ZM216,192H80a8,8,0,0,0-5.23,1.95L40,224V64H216Z',
  gear: 'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z',
  bolt: 'M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z',
  mic: 'M56,96v64a8,8,0,0,1-16,0V96a8,8,0,0,1,16,0ZM88,24a8,8,0,0,0-8,8V224a8,8,0,0,0,16,0V32A8,8,0,0,0,88,24Zm40,32a8,8,0,0,0-8,8V192a8,8,0,0,0,16,0V64A8,8,0,0,0,128,56Zm40,32a8,8,0,0,0-8,8v64a8,8,0,0,0,16,0V96A8,8,0,0,0,168,88Zm40-16a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V80A8,8,0,0,0,208,72Z',
  search:
    'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
  bell: 'M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z',
  plus: 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z',
  logout:
    'M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z',
  arrowR:
    'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z',
  arrowL:
    'M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z',
  play: 'M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z',
  stop: 'M208,48H48A16,16,0,0,0,32,64V192a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V64A16,16,0,0,0,208,48Z',
  pencil:
    'M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM51.31,160,136,75.31,152.69,92,68,176.68ZM48,179.31,76.69,208H48Zm48,25.38L79.31,188,164,103.31,180.69,120Zm96-96L147.31,64l24-24L216,84.68Z',
  trash:
    'M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z',
  check:
    'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
  x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
  info: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
  lock: 'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z',
  key: 'M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z',
  mapPin:
    'M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z',
  flash: 'M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z',
  warning:
    'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z',
  refresh:
    'M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h28.69L182.06,73.37a79.56,79.56,0,0,0-56.13-23.43h-.45A79.52,79.52,0,0,0,69.59,72.71,8,8,0,0,1,58.41,61.27a96,96,0,0,1,135,.79L208,76.69V48a8,8,0,0,1,16,0ZM186.41,183.29a80,80,0,0,1-112.47-.66L59.31,168H88a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l14.63,14.63A95.43,95.43,0,0,0,130,222.06h.53a95.36,95.36,0,0,0,67.07-27.33,8,8,0,0,0-11.18-11.44Z',
  dot: 'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z',

  log: 'M136,80V128l37.3,24.9a8,8,0,0,1-8.6,13.4l-41.3-28.5A7.93,7.93,0,0,1,120,128V80a8,8,0,0,1,16,0ZM232,128A104,104,0,0,1,77.1,218.9l21.6-21.6a88,88,0,1,0-25.6-25.6l-25,25A104,104,0,1,1,232,128Z',
  server: 'M208,32H48A16,16,0,0,0,32,48V80a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,48H48V48H208Zm0,64H48a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V144A16,16,0,0,0,208,128Zm0,48H48V144H208Zm0,64H48a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V240A16,16,0,0,0,208,224Zm0,48H48V224H208Z',
  dots: 'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm52-12a12,12,0,1,0,12,12A12,12,0,0,0,192,116ZM64,116a12,12,0,1,0,12,12A12,12,0,0,0,64,116Z',
  shield: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm44.24-105.76a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.31,0l-20-20a8,8,0,0,1,11.31-11.31L128,147.31l34.93-34.92A8,8,0,0,1,172.24,110.24Z',
  terminal:
    'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216Zm-50.34,18.34a8,8,0,0,0,11.32-11.32L144.69,136l32.29-32.29a8,8,0,0,0-11.32-11.32l-32,32a8,8,0,0,0,0,11.32ZM112,152a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16Z',
  download:
    'M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0ZM141.66,133.66a8,8,0,0,1-11.32,0L96,99.31,80.34,115a8,8,0,0,1-11.32-11.32l40-40a8,8,0,0,1,11.32,0l40,40a8,8,0,0,1-11.32,11.32L160,99.31V40a8,8,0,0,0-16,0v59.31Z',
}

function I({ n, size = 16, className }: { n: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" width={size} height={size} className={className}>
      <path d={P[n] || P.info} />
    </svg>
  )
}

/* ══ 小米品牌 Logo ══ */
function MiLogo({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 808 808" width={size} height={size} style={{ borderRadius: '22%', flex: 'none' }}>
      <path fill="#ff6900" d="M723.79,84.42C647.55,8.48,537.94,0,404,0,269.89,0,160.12,8.58,83.92,84.72S0,270.43,0,404.39,7.74,648,84,724.14,269.9,808,404,808s243.85-7.71,320-83.86,84-185.78,84-319.75C808,270.25,800.16,160.54,723.79,84.42Z"/>
      <path fill="#fff" d="M374.26,553.72a5,5,0,0,1-5.06,5H300.3a5.05,5.05,0,0,1-5.12-5V373.53a5.05,5.05,0,0,1,5.12-5h68.9a5,5,0,0,1,5.06,5Z"/>
      <path fill="#fff" d="M509.18,553.72a5.05,5.05,0,0,1-5.09,5H438.5a5,5,0,0,1-5.1-5V398.26c-.07-27.15-1.62-55-15.64-69.06-12-12.09-34.51-14.86-57.88-15.44H241a5,5,0,0,0-5.07,5v235a5.07,5.07,0,0,1-5.12,5H165.16a5,5,0,0,1-5.06-5V254.31a5,5,0,0,1,5.06-5H354.52c49.49,0,101.22,2.26,126.74,27.81s27.92,77.3,27.92,126.85Z"/>
      <path fill="#fff" d="M644.29,553.72a5.06,5.06,0,0,1-5.09,5H573.57a5,5,0,0,1-5.08-5V254.31a5,5,0,0,1,5.08-5H639.2a5.06,5.06,0,0,1,5.09,5Z"/>
    </svg>
  )
}

/* ══ 工具 ══ */
const greeting = () => {
  const h = new Date().getHours()
  return h < 6 ? '凌晨好' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'
}

const keyTail = (k?: string) => {
  if (!k) return ''
  const t = k.slice(-5)
  return '…' + t
}

const roomOf = (alias: string, did?: string) => {
  const s = (alias || '') + (did || '')
  if (s.includes('客餐厅')) return '客餐厅'
  if (s.includes('起居室')) return '起居室'
  if (s.includes('地下室')) return '地下室'
  return '未设置'
}

const coverOf = (alias: string, did?: string) => {
  const r = roomOf(alias, did)
  return r === '起居室' ? studyImg : r === '地下室' ? closeImg : livingImg
}

const avatarOf = (name: string) => {
  if (name.includes('MIX')) return girlImg
  if (name.includes('深夜')) return catImg
  return robotImg
}

/** 思考服务供应商（与 mi-gpt 原版一致：自定义 + 8 家官方） */
const PROVIDERS: Record<string, string> = {
  custom: '自定义',
  openai: 'OpenAI',
  zhipu: '智谱 AI',
  doubao: '豆包',
  qwen: '通义千问',
  deepseek: 'DeepSeek',
  yi: '零一万物（万知）',
  baichuan: '百川智能（百小应）',
  moonshot: 'Moonshot (Kimi)',
}

/** 供应商 → 默认接口地址与示例模型（切换供应商时自动带出，可覆盖） */
const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string }> = {
  custom: { baseUrl: '', model: '' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1-8k' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  yi: { baseUrl: 'https://api.lingyiwanwu.com/v1', model: 'yi-large' },
  baichuan: { baseUrl: 'https://api.baichuan-ai.com/v1', model: 'baichuan-ai-4' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
}

/** 语音服务 TTS 引擎（对应 mi-gpt-tts 支持能力；builtin = 默认语音） */
const TTS_ENGINES: Record<string, string> = {
  builtin: '默认语音',
  edge: 'Edge 大声朗读',
  volcano: '火山（豆包）',
  openai: 'OpenAI',
  custom: '自定义',
}

/* ══ 登录页 ══ */
function LoginPage({ onLogin, error }: { onLogin: (u: string, p: string) => Promise<void>; error: string }) {
  const [u, setU] = useState('admin')
  const [p, setP] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = () => {
    setBusy(true)
    Promise.resolve(onLogin(u, p)).finally(() => setBusy(false))
  }
  return (
    <div className="login-page">
      {/* 左：满铺主视觉，标语沉于音箱下方 */}
      <div className="login-hero">
        <img className="login-hero-bg" src={heroImg} alt="" />
        <div className="login-hero-scrim" />
        <div className="mi-brand">
          <MiLogo size={30} />
          <b>MiGPT</b>
        </div>
        <div className="login-hero-inner">
          <h1>多台音箱，一个大脑</h1>
        </div>
      </div>

      {/* 右侧：登录表单 */}
      <div className="login-panel">
        <div className="login-card">
          <h2>MiGPT 控制面板</h2>
          {error && (
            <div className="notice bad">
              <I n="warning" size={15} /> {error}
            </div>
          )}
          <div className="fld ic">
            <label>用户名</label>
            <I n="user" size={15} />
            <input value={u} onChange={(e) => setU(e.target.value)} autoFocus placeholder="请输入用户名" />
          </div>
          <div className="fld ic">
            <label>密码</label>
            <I n="lock" size={15} />
            <input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="请输入密码"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submit()
                }
              }}
            />
          </div>
          <button
            className="btn primary login-btn"
            disabled={busy || !u || !p}
            onClick={submit}
          >
            <I n="lock" size={15} /> {busy ? '登录中…' : '登录'}
          </button>
        </div>
        <div className="login-foot">v1.12.0 · migpt-server</div>
      </div>
    </div>
  )
}

/* ══ 弹窗表单 ══ */
interface ModalState {
  kind: 'account' | 'think' | 'voice' | 'role' | 'pwd' | 'deviceBind'
  title: string
  desc: string
  payload?: unknown
}

/* ══ 主应用 ══ */
type View = 'home' | 'accounts' | 'devices' | 'roles' | 'logs' | 'think' | 'voice' | 'models' | 'rooms' | 'settings' | 'profile' | 'syslogs'

const TITLES: Record<View, string> = {
  home: '首页',
  accounts: '账号设备',
  devices: '设备服务',
  roles: '对话角色',
  logs: '对话记录',
  think: '思考服务',
  voice: '语音服务',
  models: '设备型号',
  rooms: '会话群',
  settings: '基础设置',
  profile: '个人中心',
  syslogs: '系统日志',
}

export function App() {
  const [authed, setAuthed] = useState<boolean>(!!api.getAuthHeader())
  const [loginErr, setLoginErr] = useState('')
  const [view, setView] = useState<View>('home')
  const [settingTab, setSettingTab] = useState<'think' | 'voice'>('think')
  const [query, setQuery] = useState('')
  const [sideOff, setSideOff] = useState<boolean>(() => localStorage.getItem('migpt-side-off') === '1')
  useEffect(() => {
    localStorage.setItem('migpt-side-off', sideOff ? '1' : '0')
  }, [sideOff])

  const SEARCH_HINT: Record<string, string> = {
    home: '搜索账号 / 设备 / 角色 / 服务',
    accounts: '搜索账号名称 / 小米 ID',
    devices: '搜索设备名称 / did',
    roles: '搜索角色名称 / 人设关键词',
    think: '搜索思考服务名称 / 模型',
    voice: '搜索语音服务名称 / 供应商',
    models: '搜索型号名称 / 标识 / did',
    rooms: '搜索会话群名称 / 描述',
    logs: '搜索对话记录内容',
    syslogs: '搜索系统日志内容',
    profile: '搜索设置项',
  }
  const [bannerIdx, setBannerIdx] = useState(0)

  const [selAcct, setSelAcct] = useState<string | null>(null)
  const [acctDraft, setAcctDraft] = useState<{ name: string; miUserId: string; passToken: string } | null>(null)
  const [acctEdit, setAcctEdit] = useState(false)
  const [selThink, setSelThink] = useState<string | null>(null)
  const [thinkDraft, setThinkDraft] = useState<{ name: string; provider: string; model: string; apiKey: string; temperature: string; baseUrl: string } | null>(null)
  const [thinkEdit, setThinkEdit] = useState(false)
  const [selVoice, setSelVoice] = useState<string | null>(null)
  const [voiceDraft, setVoiceDraft] = useState<{
    name: string
    provider: string
    voiceId: string
    edgeToken: string
    volcanoAppId: string
    volcanoToken: string
    openaiKey: string
    openaiModel: string
    openaiBaseUrl: string
    customJson: string
  } | null>(null)
  const [voiceEdit, setVoiceEdit] = useState(false)
  const [devEdit, setDevEdit] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; msg: string; onOk: () => void } | null>(null)
  const [confirmLeaving, setConfirmLeaving] = useState(false)
  const closeConfirm = (doIt?: boolean) => {
    if (confirmLeaving) return
    setConfirmLeaving(true)
    window.setTimeout(() => {
      const c = confirm
      setConfirm(null)
      setConfirmLeaving(false)
      if (doIt && c) c.onOk()
    }, 200)
  }

  useEffect(() => {
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % 5), 5000)
    return () => clearInterval(t)
  }, [])

  const selectAcct = (id: string | null) => {
    setSelAcct(id)
    const a = id ? accounts.find((x) => x.id === id) : null
    setAcctDraft({ name: a?.name || '', miUserId: a?.miUserId || '', passToken: '' })
    setAcctEdit(id === null)
  }
  const selectThink = (id: string | null) => {
    setSelThink(id)
    const s = id ? thinkSvcs.find((x) => x.id === id) : null
    setThinkDraft({
      name: s?.name || '',
      provider: s?.provider || 'doubao',
      model: s?.model || PROVIDER_PRESETS[s?.provider || 'doubao']?.model || '',
      apiKey: '',
      temperature: String(s?.temperature ?? 0.7),
      baseUrl: s?.baseUrl || PROVIDER_PRESETS[s?.provider || '']?.baseUrl || '',
    })
    setThinkEdit(id === null)
  }
  const selectVoice = (id: string | null) => {
    setSelVoice(id)
    const s = id ? voiceSvcs.find((x) => x.id === id) : null
    const tts = s?.tts || {}
    setVoiceDraft({
      name: s?.name || '',
      provider: s?.provider || 'edge',
      voiceId: s?.voiceId || '',
      edgeToken: tts.edge?.trustedToken || '',
      volcanoAppId: tts.volcano?.appId || '',
      volcanoToken: tts.volcano?.accessToken || '',
      openaiKey: tts.openai?.apiKey || '',
      openaiModel: tts.openai?.model || '',
      openaiBaseUrl: tts.openai?.baseUrl || '',
      customJson: s?.tts ? JSON.stringify(s.tts, null, 2) : '',
    })
    setVoiceEdit(id === null)
  }

  const saveAcct = async () => {
    if (!acctDraft) return
    try {
      if (selAcct) {
        await api.updateAccount(selAcct, { name: acctDraft.name, miUserId: acctDraft.miUserId, ...(acctDraft.passToken ? { passToken: acctDraft.passToken } : {}) })
        showToast('账号已保存，换绑账号需重启受影响设备')
        setAcctEdit(false)
      } else {
        const created = await api.createAccount({ name: acctDraft.name, miUserId: acctDraft.miUserId, passToken: acctDraft.passToken })
        showToast('账号已创建')
        await refreshAll()
        selectAcct(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delAcct = async (id: string) => {
    const used = accountUsage(id)
    if (used.length) {
      showToast(`该账号正被 ${used.length} 台设备引用（${used.join('、')}），请先解除设备绑定`)
      return
    }
    const name = accounts.find((a) => a.id === id)?.name || '该账号'
    setConfirm({
      title: '删除云端账号',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteAccount(id)
          showToast('账号已删除')
          setSelAcct(null)
          setAcctDraft(null)
          setAcctEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  const saveThink = async () => {
    if (!thinkDraft) return
    try {
      const out: Record<string, unknown> = { name: thinkDraft.name, provider: thinkDraft.provider, model: thinkDraft.model, temperature: parseFloat(thinkDraft.temperature) || 0.7 }
      out.baseUrl = thinkDraft.baseUrl || PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl || ''
      if (thinkDraft.apiKey) out.apiKey = thinkDraft.apiKey
      if (selThink) {
        await api.updateThinkService(selThink, out)
        showToast('思考服务已保存，绑定设备热生效')
        setThinkEdit(false)
      } else {
        const created = await api.createThinkService(out)
        showToast('思考服务已创建')
        await refreshAll()
        selectThink(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delThink = async (id: string) => {
    const roleRefs = roles.filter((r) => r.thinkServiceId === id)
    if (roleRefs.length) {
      showToast(`该思考服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`)
      return
    }
    const name = thinkSvcs.find((s) => s.id === id)?.name || '该服务'
    setConfirm({
      title: '删除思考服务',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteThinkService(id)
          showToast('服务已删除')
          setSelThink(null)
          setThinkDraft(null)
          setThinkEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  const saveVoice = async () => {
    if (!voiceDraft) return
    try {
      const out: Record<string, unknown> = { name: voiceDraft.name, provider: voiceDraft.provider }
      if (voiceDraft.voiceId) out.voiceId = voiceDraft.voiceId
      const tts: Record<string, unknown> = {}
      if (voiceDraft.provider === 'edge') {
        tts.edge = voiceDraft.edgeToken ? { trustedToken: voiceDraft.edgeToken } : {}
      } else if (voiceDraft.provider === 'volcano') {
        if (!voiceDraft.volcanoAppId || !voiceDraft.volcanoToken) {
          showToast('火山引擎需填写 App ID 与访问令牌')
          return
        }
        tts.volcano = { appId: voiceDraft.volcanoAppId, accessToken: voiceDraft.volcanoToken }
      } else if (voiceDraft.provider === 'openai') {
        if (!voiceDraft.openaiKey) {
          showToast('OpenAI TTS 需填写 API Key')
          return
        }
        tts.openai = {
          apiKey: voiceDraft.openaiKey,
          ...(voiceDraft.openaiModel ? { model: voiceDraft.openaiModel } : {}),
          ...(voiceDraft.openaiBaseUrl ? { baseUrl: voiceDraft.openaiBaseUrl } : {}),
        }
      } else if (voiceDraft.provider === 'custom') {
        try {
          const j = JSON.parse(voiceDraft.customJson || '{}')
          Object.assign(tts, j)
        } catch {
          showToast('自定义 TTS 配置不是合法 JSON')
          return
        }
      }
      if (Object.keys(tts).length) out.tts = tts as never
      if (selVoice) {
        await api.updateVoiceService(selVoice, out)
        showToast('语音服务已保存，绑定设备支持热切')
        setVoiceEdit(false)
      } else {
        const created = await api.createVoiceService(out)
        showToast('语音服务已创建')
        await refreshAll()
        selectVoice(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delVoice = async (id: string) => {
    if (voiceSvcs.find((v) => v.id === id)?.builtin) {
      showToast('内置语音服务不可删除')
      return
    }
    const roleRefs = roles.filter((r) => r.voiceId === id)
    if (roleRefs.length) {
      showToast(`该语音服务正被对话角色「${roleRefs.map((r) => r.name).join('、')}」引用，请先解除引用`)
      return
    }
    const name = voiceSvcs.find((s) => s.id === id)?.name || '该服务'
    setConfirm({
      title: '删除语音服务',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteVoiceService(id)
          showToast('服务已删除')
          setSelVoice(null)
          setVoiceDraft(null)
          setVoiceEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const [accounts, setAccounts] = useState<Account[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [thinkSvcs, setThinkSvcs] = useState<ThinkService[]>([])
  const [voiceSvcs, setVoiceSvcs] = useState<VoiceService[]>([])
  const [models, setModels] = useState<SpeakerModel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [logCount, setLogCount] = useState(0)
  const [loading, setLoading] = useState(true)

  /* ── 型号管理（音箱的「硬件身份」配置）──────────────────────── */
  const [selModel, setSelModel] = useState<string | null>(null)
  const [modelEdit, setModelEdit] = useState(false)
  const [modelFilter, setModelFilter] = useState<'all' | 'consec' | 'plain'>('all')
  const [modelDraft, setModelDraft] = useState<{
    name: string
    did: string
    desc: string
    imageUrl: string
    ttsCommand: string[]
    wakeUpCommand: string[]
    playingCommand: string[]
    consecutive: boolean
  } | null>(null)
  const selectModel = (id: string | null) => {
    setSelModel(id)
    setModelEdit(false)
    if (!id) {
      setModelDraft({
        name: '', did: '', desc: '', imageUrl: '',
        ttsCommand: ['', ''], wakeUpCommand: ['', ''], playingCommand: ['', '', ''],
        consecutive: true,
      })
      return
    }
    const m = models.find((x) => x.id === id)
    setModelDraft(
      m
        ? {
            name: m.name, did: m.did, desc: m.desc || '', imageUrl: m.imageUrl || '',
            ttsCommand: (m.ttsCommand || []).map(String),
            wakeUpCommand: (m.wakeUpCommand || []).map(String),
            playingCommand: (m.playingCommand || []).map(String),
            consecutive: m.consecutive ?? true,
          }
        : null,
    )
  }
  const saveModel = async () => {
    if (!modelDraft || !modelDraft.name.trim() || !modelDraft.did.trim()) {
      showToast('名称与型号标识必填')
      return
    }
    try {
      const toNums = (arr: string[]): number[] => arr.map(Number).filter((n) => Number.isFinite(n))
      const out = {
        name: modelDraft.name.trim(),
        did: modelDraft.did.trim(),
        desc: modelDraft.desc.trim(),
        imageUrl: modelDraft.imageUrl.trim(),
        ttsCommand: toNums(modelDraft.ttsCommand),
        wakeUpCommand: toNums(modelDraft.wakeUpCommand),
        playingCommand: toNums(modelDraft.playingCommand),
        consecutive: modelDraft.consecutive,
      }
      if (selModel) {
        await api.updateSpeakerModel(selModel, out)
        showToast('型号已保存，绑定设备重启后生效')
        setModelEdit(false)
      } else {
        const created = await api.createSpeakerModel(out)
        showToast('型号已创建')
        await refreshAll()
        selectModel(created.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }
  const delModel = async (id: string) => {
    const target = models.find((m) => m.id === id)
    if (target?.builtin) {
      showToast('系统内置型号不可删除')
      return
    }
    const refDevs = devices.filter((d) => d.speakerModel === id || d.speakerModel === target?.name)
    if (refDevs.length) {
      showToast(`该型号正被设备「${refDevs.map((d) => d.alias).join('、')}」引用，请先解除引用`)
      return
    }
    const name = target?.name || '该型号'
    setConfirm({
      title: '删除音箱型号',
      msg: `确定删除「${name}」吗？删除后不可恢复。`,
      onOk: async () => {
        try {
          await api.deleteSpeakerModel(id)
          showToast('型号已删除')
          setSelModel(null)
          setModelDraft(null)
          setModelEdit(false)
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }
  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中列表第一个（列表为排序后的 filterModels） */
  useEffect(() => {
    if (!selModel && filterModels.length) {
      setSelModel(filterModels[0].id)
      setModelEdit(false)
    }
  }, [models, query, modelFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  /* 统一「左列表 + 右详情/新建」：进入页面后默认选中第一个 */
  useEffect(() => {
    if (!selAcct && accounts.length) {
      setSelAcct(accounts[0].id)
      setAcctEdit(false)
      setAcctDraft({ name: accounts[0].name, miUserId: accounts[0].miUserId, passToken: '' })
    }
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selThink && thinkSvcs.length) {
      setSelThink(thinkSvcs[0].id)
      const s = thinkSvcs[0]
      setThinkEdit(false)
      setThinkDraft({ name: s.name, provider: s.provider, model: s.model || PROVIDER_PRESETS[s.provider]?.model || '', apiKey: '', temperature: String(s.temperature ?? 0.7), baseUrl: s.baseUrl || PROVIDER_PRESETS[s.provider]?.baseUrl || '' })
    }
  }, [thinkSvcs]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selVoice && voiceSvcs.length) {
      setSelVoice(voiceSvcs[0].id)
      const s = voiceSvcs[0]
      setVoiceEdit(false)
      setVoiceDraft({ name: s.name, provider: s.provider, voiceId: s.voiceId || '', edgeToken: s.tts?.edge?.trustedToken || '', volcanoAppId: s.tts?.volcano?.appId || '', volcanoToken: s.tts?.volcano?.accessToken || '', openaiKey: s.tts?.openai?.apiKey || '', openaiModel: s.tts?.openai?.model || '', openaiBaseUrl: s.tts?.openai?.baseUrl || '', customJson: s.tts ? JSON.stringify(s.tts, null, 2) : '' })
    }
  }, [voiceSvcs]) // eslint-disable-line react-hooks/exhaustive-deps

  const [detail, setDetail] = useState<DeviceDetail | null>(null)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [selDev, setSelDev] = useState<string | null>(null)
  const [devAcctFilter, setDevAcctFilter] = useState('all')
  const [devDraft, setDevDraft] = useState<{
    alias: string
    did: string
    speakerModel: string
    accountId: string
    roleId: string
    thinkServiceId: string
    voiceOverrideId: string
    ttsSecret: string
    exitKeepAliveAfter: string
    roomRef: string
  } | null>(null)

  const [modal, setModal] = useState<ModalState | null>(null)
  const [modelPickQ, setModelPickQ] = useState('')
  const [modelPickOpen, setModelPickOpen] = useState(false)
  const [devPull, setDevPull] = useState<{ loading: boolean; err: string; list: PulledDevice[] | null }>({
    loading: false,
    err: '',
    list: null,
  })
  const [wizard, setWizard] = useState<null | { step: number; accountId: string; alias: string; did: string; model: string; roleId: string }>(null)

  useEffect(() => {
    if (!selDev && devices.length) {
      const d = devices[0]
      setSelDev(d.id)
      setDevEdit(false)
      setDevDraft({
        alias: d.alias,
        did: d.did,
        speakerModel: d.speakerModel || '',
        accountId: d.accountId || '',
        roleId: d.roleId || '',
        thinkServiceId: d.thinkServiceId || '',
        voiceOverrideId: d.voiceOverrideId || '',
        ttsSecret: d.ttsSecret || '',
        exitKeepAliveAfter: String(d.exitKeepAliveAfter ?? 30),
        roomRef: d.roomRef || '',
      })
    }
  }, [devices]) // eslint-disable-line react-hooks/exhaustive-deps

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, a, r, t, v, m, rm, l] = await Promise.all([
        api.listDevices(),
        api.getAccounts(),
        api.getRoles(),
        api.getThinkServices(),
        api.getVoiceServices(),
        api.getSpeakerModels(),
        api.getRooms(),
        api.getLogs(500).then((x) => x.total).catch(() => 0),
      ])
      setDevices(d)
      setAccounts(a)
      setRoles(r)
      setThinkSvcs(t)
      setVoiceSvcs(v)
      setModels(m)
      setRooms(rm)
      setLogCount(l)
      setLoading(false)
    } catch (e) {
      setLoading(false)
      const msg = (e as Error).message
      if (msg === 'unauthorized') {
        api.clearAuth()
        setAuthed(false)
      } else {
        showToast(msg || '加载失败')
      }
    }
  }, [showToast])

  /* 认证探测 */
  useEffect(() => {
    if (!authed) return
    refreshAll().catch(() => undefined)
  }, [authed, refreshAll])

  /* 设备运行状态 10s 轮询（静默，不触发全局 loading） */
  useEffect(() => {
    if (!authed) return
    const t = window.setInterval(async () => {
      try {
        const d = await api.listDevices()
        setDevices(d)
      } catch {
        /* 轮询失败静默，下一轮重试 */
      }
    }, 10000)
    return () => window.clearInterval(t)
  }, [authed])

  const doLogin = async (u: string, p: string) => {
    setLoginErr('')
    api.setAuth(u, p)
    try {
      await api.getStatusAll()
      setAuthed(true)
      setView('home')
    } catch (e) {
      const msg = (e as Error).message
      if (msg === 'unauthorized') {
        api.clearAuth()
        setLoginErr('用户名或密码错误（初始账号 admin，密码 123456）')
      } else {
        api.clearAuth()
        setLoginErr(msg || '无法连接服务')
      }
    }
  }

  const doLogout = () => {
    api.clearAuth()
    setAuthed(false)
    setAccounts([])
    setDevices([])
    setRoles([])
    setThinkSvcs([])
    setVoiceSvcs([])
    setModels([])
    setRooms([])
  }

  /* 派生统计 */
  const runningCount = devices.filter((d) => d.running).length
  const builtinModelCount = models.filter((m) => m.builtin).length
  const customModelCount = models.length - builtinModelCount
  const thinkName = (id?: string) => thinkSvcs.find((s) => s.id === id)?.name || '未指定'
  const voiceName = (id?: string) => voiceSvcs.find((s) => s.id === id)?.name || '未指定'
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name || '未绑定'
  const roleName = (id?: string) => roles.find((r) => r.id === id)?.name || '未指定'
  const defaultThink = thinkSvcs.find((s) => s.isDefault)
  const defaultVoice = voiceSvcs.find((s) => s.isDefault)
  const selVoiceObj = selVoice ? voiceSvcs.find((s) => s.id === selVoice) : null

  /* 服务被引用数（设备直接引用 + 通过角色间接引用） */
  const thinkUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(roles.filter((r) => r.thinkServiceId === id).map((r) => r.id))
      return devices.filter((d) => d.thinkServiceId === id || (d.roleId && roleIds.has(d.roleId))).length
    },
    [devices, roles],
  )
  const voiceUsage = useCallback(
    (id: string) => {
      const roleIds = new Set(roles.filter((r) => r.voiceId === id).map((r) => r.id))
      return devices.filter((d) => d.voiceOverrideId === id || (d.roleId && roleIds.has(d.roleId))).length
    },
    [devices, roles],
  )
  const roleUsage = useCallback(
    (id: string) => devices.filter((d) => d.roleId === id).map((d) => d.alias),
    [devices],
  )
  const accountUsage = useCallback(
    (id: string) => devices.filter((d) => d.accountId === id).map((d) => d.alias),
    [devices],
  )
  const roomUsage = useCallback(
    (id: string) => devices.filter((d) => d.roomRef === id).map((d) => d.alias),
    [devices],
  )

  /* 设备抽屉 */
  const openDevice = useCallback(
    async (id: string) => {
      setDrawerBusy(true)
      try {
        const d = await api.getDevice(id)
        setDetail(d)
        setDrawerBusy(false)
      } catch (e) {
        setDrawerBusy(false)
        showToast((e as Error).message || '加载设备详情失败')
      }
    },
    [showToast],
  )
  const closeDrawer = useCallback(() => setDetail(null), [])

  /* 设备页：左列表选中 → 右侧详情/新建（与其他页 split 一致） */
  const selectDev = (id: string | null) => {
    setSelDev(id)
    setDevEdit(id === null)
    if (id) {
      const d = devices.find((x) => x.id === id)
      setDevDraft(
        d
          ? {
              alias: d.alias,
              did: d.did,
              speakerModel: d.speakerModel || '',
              accountId: d.accountId || '',
              roleId: d.roleId || '',
              thinkServiceId: d.thinkServiceId || '',
              voiceOverrideId: d.voiceOverrideId || '',
              ttsSecret: d.ttsSecret || '',
              exitKeepAliveAfter: String(d.exitKeepAliveAfter ?? 30),
              roomRef: d.roomRef || '',
            }
          : null,
      )
    } else {
      setDevDraft({ alias: '', did: '', speakerModel: '', accountId: '', roleId: '', thinkServiceId: '', voiceOverrideId: '', ttsSecret: '', exitKeepAliveAfter: '30', roomRef: '' })
    }
  }

  const saveDeviceForm = async () => {
    if (!devDraft) return
    try {
      if (selDev) {
        await api.saveDevice(selDev, {
          meta: {
            alias: devDraft.alias,
            did: devDraft.did,
            speakerModel: devDraft.speakerModel || undefined,
            accountId: devDraft.accountId || undefined,
            roleId: devDraft.roleId || undefined,
            thinkServiceId: devDraft.thinkServiceId || undefined,
            voiceOverrideId: devDraft.voiceOverrideId || undefined,
            exitKeepAliveAfter: parseInt(devDraft.exitKeepAliveAfter || '30', 10) || 30,
            roomRef: devDraft.roomRef || undefined,
            ttsSecret: devDraft.ttsSecret || undefined,
          },
        })
        showToast('设备已更新，需重启设备生效')
        setDevEdit(false)
      } else {
        const res = await api.createDevice({
          alias: devDraft.alias,
          did: devDraft.did,
          speakerModel: devDraft.speakerModel || undefined,
          accountId: devDraft.accountId || undefined,
          roleId: devDraft.roleId || undefined,
          thinkServiceId: devDraft.thinkServiceId || undefined,
          voiceOverrideId: devDraft.voiceOverrideId || undefined,
        })
        showToast('设备已添加，点击「重启设备」使其生效')
        await refreshAll()
        selectDev(res.id)
        return
      }
      refreshAll()
    } catch (e) {
      showToast(errText(e))
    }
  }

  const removeDeviceForm = async () => {
    if (!selDev) return
    const name = devices.find((d) => d.id === selDev)?.alias || '该设备'
    setConfirm({
      title: '删除设备',
      msg: `确定删除「${name}」吗？删除后需重新添加才能管理。`,
      onOk: async () => {
        try {
          await api.deleteDevice(selDev)
          setSelDev(null)
          setDevDraft(null)
          setDevEdit(false)
          showToast('设备已删除')
          refreshAll()
        } catch (e) {
          showToast(errText(e))
        }
      },
    })
  }

  const restartDevice = async (id: string) => {
    try {
      await api.startDevice(id)
      showToast('已重启设备，账号信息约 1 小时后更新')
      refreshAll()
    } catch (e) {
      showToast((e as Error).message || '重启失败')
    }
  }

  const removeDevice = async (id: string) => {
    try {
      await api.deleteDevice(id)
      setDetail(null)
      showToast('设备已解绑')
      refreshAll()
    } catch (e) {
      showToast((e as Error).message || '解绑失败')
    }
  }

  /* 通用错误处理（409 删除保护等） */
  const errText = (e: unknown) => {
    const err = e as Error & { refs?: { roles?: string[]; devices?: string[] } }
    if (err.refs) {
      const parts: string[] = []
      if (err.refs.devices?.length) parts.push('被设备引用：' + err.refs.devices.join('、'))
      if (err.refs.roles?.length) parts.push('被角色引用：' + err.refs.roles.join('、'))
      return err.message + (parts.length ? '（' + parts.join('；') + '）' : '')
    }
    return err.message || '操作失败'
  }

  /* 从云端账号拉取音箱设备列表（新建设备 / 三步向导复用） */
  const doPullDev = async (accountId: string) => {
    if (!accountId) return
    setDevPull({ loading: true, err: '', list: null })
    try {
      const r = await api.pullDevices(accountId)
      const list = r.devices || []
      if (!list.length) {
        setDevPull({ loading: false, err: '该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确', list: [] })
        return
      }
      setDevPull({ loading: false, err: '', list })
    } catch (e) {
      setDevPull({ loading: false, err: errText(e), list: null })
    }
  }

  /* 账号设备：账号详情页展示该账号下云端设备列表（独立于 devPull，按账号缓存） */
  const [acctDevs, setAcctDevs] = useState<Record<string, { loading: boolean; err: string; list: Array<{ name?: string; alias?: string; deviceID?: string; miotDID?: string; hardware?: string; presence?: string }> }>>({})
  const loadAcctDevs = async (accountId: string) => {
    setAcctDevs((m) => ({ ...m, [accountId]: { loading: true, err: '', list: m[accountId]?.list || [] } }))
    try {
      const r = await api.pullDevices(accountId)
      setAcctDevs((m) => ({ ...m, [accountId]: { loading: false, err: '', list: r.devices || [] } }))
    } catch (e) {
      setAcctDevs((m) => ({ ...m, [accountId]: { loading: false, err: errText(e), list: [] } }))
    }
  }
  useEffect(() => {
    if (selAcct && !acctDevs[selAcct]) void loadAcctDevs(selAcct)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selAcct])

  const filterDevices = useMemo(() => {
    let list = devices
    if (devAcctFilter !== 'all') list = list.filter((d) => d.accountId === devAcctFilter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((d) => (d.alias + d.did).toLowerCase().includes(q))
    }
    return list
  }, [devices, query, devAcctFilter])
  const devAcctGroups = useMemo(() => {
    const ids: string[] = []
    devices.forEach((d) => {
      if (d.accountId && !ids.includes(d.accountId)) ids.push(d.accountId)
    })
    return ids
      .map((id) => ({ id, name: accounts.find((a) => a.id === id)?.name || id }))
      .filter((g) => !!g.name)
  }, [devices, accounts])
  const filterAccounts = useMemo(() => {
    if (!query) return accounts
    const q = query.toLowerCase()
    return accounts.filter((a) => (a.name + a.miUserId).toLowerCase().includes(q))
  }, [accounts, query])
  const filterRoles = useMemo(() => {
    if (!query) return roles
    const q = query.toLowerCase()
    return roles.filter((r) => r.name.toLowerCase().includes(q))
  }, [roles, query])
  const filterThink = useMemo(() => {
    if (!query) return thinkSvcs
    const q = query.toLowerCase()
    return thinkSvcs.filter((s) => (s.name + s.model).toLowerCase().includes(q))
  }, [thinkSvcs, query])
  const filterVoice = useMemo(() => {
    if (!query) return voiceSvcs
    const q = query.toLowerCase()
    return voiceSvcs.filter((s) => s.name.toLowerCase().includes(q))
  }, [voiceSvcs, query])
  const filterRooms = useMemo(() => {
    if (!query) return rooms
    const q = query.toLowerCase()
    return rooms.filter((rm) => (rm.name + (rm.description || '')).toLowerCase().includes(q))
  }, [rooms, query])
  const filterModels = useMemo(() => {
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (modelFilter === 'consec' && !m.consecutive) return false
      if (modelFilter === 'plain' && m.consecutive) return false
      return true
    })
    // 内置型号按名称升序在前，自定义型号按创建时间追加尾部
    const builtin = list.filter((m) => m.builtin).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list.filter((m) => !m.builtin).sort((a, b) => a.createdAt - b.createdAt)
    return [...builtin, ...custom]
  }, [models, query, modelFilter])

  /* 切换顶部分组后默认选中对应分组列表第一个（与其他菜单页面规则一致） */
  const switchModelFilter = (f: 'all' | 'consec' | 'plain') => {
    setModelFilter(f)
    const q = query.toLowerCase()
    const list = models.filter((m) => {
      if (q && !(m.name + m.did).toLowerCase().includes(q)) return false
      if (f === 'consec' && !m.consecutive) return false
      if (f === 'plain' && m.consecutive) return false
      return true
    })
    const builtin = list.filter((m) => m.builtin).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    const custom = list.filter((m) => !m.builtin).sort((a, b) => a.createdAt - a.createdAt)
    const first = [...builtin, ...custom][0]
    if (first) {
      setSelModel(first.id)
      setModelEdit(false)
      setModelDraft(null)
    }
  }

  /* ══ 渲染 ══ */
  if (!authed) {
    return <LoginPage onLogin={doLogin} error={loginErr} />
  }

  return (
    <div className={'app' + (sideOff ? ' off' : '')}>
      {/* 侧栏 */}
      <aside className={'side' + (sideOff ? ' off' : '')}>
        <div className="brand">
          <span className="mark">
            <MiLogo size={22} />
          </span>
          <span className="brand-txt">
            <b>MiGPT 控制面板</b>
          </span>
        </div>
        <nav>
          {(['home', 'think', 'voice', 'roles', 'accounts', 'devices', 'rooms', 'models', 'logs', 'syslogs'] as View[]).map((v) => (
            <a
              key={v}
              data-label={TITLES[v]}
              className={view === v ? 'on' : ''}
              onClick={() => {
                setView(v)
                if (v === 'think') setSettingTab('think')
                if (v === 'voice') setSettingTab('voice')
                setQuery('')
              }}
            >
              <I n={v === 'home' ? 'home' : v === 'accounts' ? 'user' : v === 'devices' ? 'speaker' : v === 'roles' ? 'chat' : v === 'logs' ? 'log' : v === 'syslogs' ? 'terminal' : v === 'think' ? 'bolt' : v === 'voice' ? 'mic' : v === 'rooms' ? 'users' : 'gear'} />
              <span className="label">{TITLES[v]}</span>
            </a>
          ))}
        </nav>
        <div className="foot">
          <div className="user-card" onClick={() => setView('profile')}>
            <span className="avatar">A</span>
            <span className="foot-txt">
              <b>admin</b>
              <span>点击进入个人中心 ›</span>
            </span>
          </div>
        </div>
        <button
          className={'side-toggle' + (sideOff ? ' off' : '')}
          title={sideOff ? '展开侧栏' : '收起侧栏'}
          onClick={() => setSideOff(!sideOff)}
          aria-label={sideOff ? '展开侧栏' : '收起侧栏'}
        >
          <svg viewBox="0 0 12 24" className="tri" aria-hidden="true">
            <path d={sideOff ? 'M10 12 L3.6 1 L3.6 23 Z' : 'M3.6 12 L10 1 L10 23 Z'} />
          </svg>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          <h1>{TITLES[view]}</h1>
          <label className="search">
            <I n="search" />
            <input placeholder={SEARCH_HINT[view] || '搜索…'} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="sp" />
          <div className="top-right">
            <div className="srv" title="migpt-server 服务状态">
              <span className="dot" />
              <span>服务运行中</span>
              <em>v1.12.0</em>
            </div>
          </div>
        </header>

        <div className="body">
          {loading && view !== 'devices' && view !== 'home' && (
            <div className="panel">
              <div className="loading">
                <div style={{ width: '100%' }}>
                  <div className="skel" />
                  <div className="skel" />
                  <div className="skel" />
                </div>
              </div>
            </div>
          )}

          {view === 'home' && (
            <section data-view="home" className="on">
              <div className="hero banner">
                {[bannerHomeImg, bannerBedroomImg, bannerStudyImg, bannerKitchenImg, bannerBalconyImg].map((b, i) => (
                  <div key={i} className={'art' + (i === bannerIdx ? ' on' : '')} style={{ backgroundImage: `url(${b})` }} />
                ))}
                <div className="dots">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={i === bannerIdx ? 'on' : ''} onClick={() => setBannerIdx(i)} />
                  ))}
                </div>
                <span className="idx">{bannerIdx + 1} / 5</span>
              </div>
              <div className="kpis">
                <button className="kpi" onClick={() => setView('accounts')}>
                  <span className="pic" style={{ backgroundImage: `url(${livingImg})` }} />
                  <div className="kv">
                    <div className="k">账号设备</div>
                    <div className="v num">{accounts.length}</div>
                  </div>
                  <div className="d mut">{accounts.map((a) => a.name).join(' + ') || '尚未接入'}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => setView('devices')}>
                  <span className="pic" style={{ backgroundImage: `url(${roomImg})` }} />
                  <div className="kv">
                    <div className="k">设备服务</div>
                    <div className="v num">{devices.length}</div>
                  </div>
                  <div className="d mut">{runningCount > 0 ? `${runningCount} 台运行中` : devices.length > 0 ? '部分设备待启动' : '尚未绑定音箱'}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => setView('roles')}>
                  <span className="pic" style={{ backgroundImage: `url(${roleImg})` }} />
                  <div className="kv">
                    <div className="k">对话角色</div>
                    <div className="v num">{roles.length}</div>
                  </div>
                  <div className="d mut">{roles.map((r) => r.name).join(' · ') || '尚未创建'}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => setView('logs')}>
                  <span className="pic" style={{ backgroundImage: `url(${studyImg})` }} />
                  <div className="kv">
                    <div className="k">对话记录</div>
                    <div className="v num">{logCount}</div>
                  </div>
                  <div className="d mut">累计对话与系统日志</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => { setSettingTab('think'); setView('think') }}>
                  <span className="pic" style={{ backgroundImage: `url(${heroImg})` }} />
                  <div className="kv">
                    <div className="k">思考服务</div>
                    <div className="v num">{thinkSvcs.length}</div>
                  </div>
                  <div className="d mut">{thinkSvcs.map((t) => t.name).join(' · ') || '尚未配置'}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => { setSettingTab('voice'); setView('voice') }}>
                  <span className="pic" style={{ backgroundImage: `url(${voiceImg})` }} />
                  <div className="kv">
                    <div className="k">语音服务</div>
                    <div className="v num">{voiceSvcs.length}</div>
                  </div>
                  <div className="d mut">{voiceSvcs.map((v) => v.name).join(' · ') || '尚未配置'}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
                <button className="kpi" onClick={() => setView('models')}>
                  <span className="pic" style={{ backgroundImage: `url(${modelsImg})` }} />
                  <div className="kv">
                    <div className="k">设备型号</div>
                    <div className="v num">{models.length}</div>
                  </div>
                  <div className="d mut">内置 {builtinModelCount} · 自定义 {customModelCount}</div>
                  <I n="arrowR" className="go" size={14} />
                </button>
              </div>
              <div className="panel guide">
                <div className="guide-main">
                  <b className="guide-h">
                    新手引导
                    <span className="sub">3 步完成接入</span>
                  </b>
                  {[
                    ['连接账号', '选择已有云端账号，或新建并填入小米 ID 与 passToken', girlImg],
                    ['选择设备', '从云端账号拉取音箱列表，选择要接入的设备', catImg],
                    ['对话服务', '选择已有对话角色，或新建角色绑定人设', closeImg],
                  ].map(([t, d, img], i) => (
                    <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="step-pic" style={{ backgroundImage: `url(${img})` }} />
                      <div style={{ flex: 1 }}>
                        <b style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="tag accent" style={{ borderRadius: '50%', width: 20, height: 20, display: 'inline-grid', placeItems: 'center', padding: 0, fontWeight: 700, fontSize: 11 }}>
                            {i + 1}
                          </span>
                          {t}
                        </b>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{d}</div>
                      </div>
                    </div>
                  ))}
                  <button className="btn primary" style={{ justifyContent: 'center', alignSelf: 'center' }} onClick={() => setWizard({ step: 0, accountId: '', alias: '', did: '', model: '', roleId: '' })}>
                    开始三步连接
                  </button>
                </div>
                <div className="guide-art" style={{ backgroundImage: `url(${livingImg})` }} />
              </div>
            </section>
          )}

          {view === 'accounts' && (
            <section data-view="accounts" className="on">
              <div className="filters">
                <span className="chip on">全部账号</span>
                <span className="sp">
                  <span className="count">共 {accounts.length} 个</span>
                </span>
              </div>
              <div className="split">
                <aside className="slist">
                  {filterAccounts.map((a) => (
                    <div key={a.id} className={'li' + (a.id === selAcct ? ' on' : '')} onClick={() => selectAcct(a.id)}>
                      <span className="ic">
                        <I n="user" />
                      </span>
                      <span className="txt">
                        <b>{a.name}</b>
                        <span>{a.miUserId} · {a === accounts[0] ? '默认' : '备用'}</span>
                      </span>
                      <span className="badge">{accountUsage(a.id).length}</span>
                    </div>
                  ))}
                  <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => selectAcct(null)}>
                    <I n="plus" /> 新建
                  </button>
                </aside>
                <section className="sdetail" key={'acct-' + (selAcct || 'new') + (acctEdit ? '-e' : '-r')}>
                  {filterAccounts.length === 0 && !acctDraft ? (
                    <div className="empty">
                      <div className="art">
                        <I n="user" size={26} />
                      </div>
                      <b>还没有云端账号</b>
                      <span>一个账号管理一个家庭；添加后将可在设备向导中直接选择。</span>
                      <button className="btn primary" onClick={() => selectAcct(null)}>
                        <I n="plus" /> 新建
                      </button>
                    </div>
                  ) : selAcct && !acctEdit ? (
                    <div className="form-card rform">
                      <h3>
                        <I n="user" size={17} /> 账号详情
                      </h3>
                      <div className="desc">账号信息与凭据状态；凭据仅保存于本机服务端。</div>
                      <div className="ro">
                        <div className="rr">
                          <span className="k">账号名称</span>
                          <span className="v">{accounts.find((a) => a.id === selAcct)?.name || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">小米 ID</span>
                          <span className="v">{accounts.find((a) => a.id === selAcct)?.miUserId || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">passToken</span>
                          <span className="v">{accounts.find((a) => a.id === selAcct)?.passToken ? '已保存' : '未配置'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">绑定设备</span>
                          <span className="v">{accountUsage(selAcct).length} 台</span>
                        </div>
                        <div className="grp" style={{ marginBottom: 2 }}>
                          <h4>
                            <I n="speaker" size={14} /> 账号设备
                          </h4>
                          {(() => {
                            const st = acctDevs[selAcct]
                            if (!st || st.loading)
                              return (
                                <div className="dev-pull loading">
                                  <span className="spin" /> 正在从云端读取设备…
                                </div>
                              )
                            if (st.err)
                              return (
                                <div className="dev-pull err">
                                  <I n="warn" size={15} />
                                  {st.err}
                                  <button className="btn ghost" style={{ marginLeft: 'auto' }} onClick={() => loadAcctDevs(selAcct)}>
                                    <I n="arrowsClockwise" /> 重试
                                  </button>
                                </div>
                              )
                            if (!st.list.length)
                              return <div className="dev-pull empty">该账号下暂无音箱设备</div>
                            return (
                              <div className="dev-pull">
                                {st.list.map((d) => {
                                  const mm = models.find((m) => m.id === d.hardware || m.name === d.hardware)
                                  const bound = devices.find((x) => x.accountId === selAcct && x.did === d.miotDID)
                                  return (
                                    <div className="pd-row" key={d.miotDID || d.deviceID}>
                                      <span className="ic t">
                                        {mm?.imageUrl ? <img src={mm.imageUrl} alt="" className="thumb" /> : <I n="speaker" />}
                                      </span>
                                      <span className="txt">
                                        <b>{d.alias || d.name}</b>
                                        <span>{d.deviceID || d.miotDID}
                                          {d.hardware ? ' · ' + (mm?.name || d.hardware) : ''}
                                        </span>
                                      </span>
                                      {bound ? (
                                        <span className="tag neu">已接入</span>
                                      ) : (
                                        <span className={'tag' + (d.presence === 'online' ? ' accent' : ' neu')}>{d.presence === 'online' ? '在线' : '离线'}</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                          <div className="pd-acts">
                            <span className="sp" />
                            <button className="btn ghost" onClick={() => loadAcctDevs(selAcct)}>
                              <I n="arrowsClockwise" /> 刷新
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="acts">
                        <span className="sp" />
                        <button className="btn danger" onClick={() => delAcct(selAcct)}>
                          <I n="trash" /> 删除
                        </button>
                        <button className="btn primary" onClick={() => setAcctEdit(true)}>
                          <I n="pencil" /> 编辑
                        </button>
                      </div>
                    </div>
                  ) : acctDraft ? (
                    <div className="form-card">
                      <h3>
                        <I n="user" size={17} /> {selAcct ? '编辑账号' : '新建云端账号'}
                      </h3>
                      <div className="desc">{selAcct ? '更新名称或凭据；换绑账号后需重启受影响设备。' : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}</div>
                      <div className="fld">
                        <label>账号名称</label>
                        <input value={acctDraft.name} placeholder="例如：默认账号" onChange={(e) => setAcctDraft({ ...acctDraft, name: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>小米 ID</label>
                        <input value={acctDraft.miUserId} placeholder="例如：1234567890" onChange={(e) => setAcctDraft({ ...acctDraft, miUserId: e.target.value })} />
                        <span className="hint">登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。</span>
                      </div>
                      <div className="fld">
                        <label>passToken</label>
                        <textarea rows={4} value={acctDraft.passToken} placeholder={accounts.find((a) => a.id === selAcct)?.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => setAcctDraft({ ...acctDraft, passToken: e.target.value })} />
                        <span className="hint">{selAcct ? '留空则保留原凭据' : '异地登录安全验证时，会给出授权链接'}</span>
                      </div>
                      <div className="acts">
                        <span className="sp" />
                        <button className="btn ghost" onClick={() => (selAcct ? setAcctEdit(false) : accounts.length ? selectAcct(accounts[0].id) : setAcctDraft(null))}>
                          取消
                        </button>
                        <button className="btn primary" onClick={saveAcct} disabled={!acctDraft.name}>
                          <I n="check" /> 保存
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </section>
          )}

          {view === 'models' && (
            <section data-view="models" className="on">
              <div className="filters">
                <span className={'chip' + (modelFilter === 'all' ? ' on' : '')} onClick={() => switchModelFilter('all')}>全部型号</span>
                <span className={'chip' + (modelFilter === 'consec' ? ' on' : '')} onClick={() => switchModelFilter('consec')}>支持连续对话</span>
                <span className={'chip' + (modelFilter === 'plain' ? ' on' : '')} onClick={() => switchModelFilter('plain')}>无法连续对话</span>
                <span className="sp">
                  <span className="count">共 {filterModels.length} 个</span>
                </span>
              </div>
              <div className="split">
                <aside className="slist">
                  {filterModels.map((m) => (
                    <div key={m.id} className={'li' + (m.id === selModel ? ' on' : '')} onClick={() => selectModel(m.id)}>
                      <span className="ic t">
                        {m.imageUrl ? <img src={m.imageUrl} alt="" className="thumb" /> : <I n="speaker" />}
                      </span>
                      <span className="txt">
                        <b>{m.name}</b>
                        <span>{m.did}{m.desc ? ' · ' + m.desc.slice(0, 18) : ''}</span>
                      </span>
                      {m.builtin ? (
                        <span className="tag">内置</span>
                      ) : (
                        <span className="count">{devices.filter((d) => d.speakerModel === m.id).length} 台</span>
                      )}
                    </div>
                  ))}
                  <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => selectModel(null)}>
                    <I n="plus" /> 新建
                  </button>
                </aside>
                <section className="sdetail" key={'model-' + (selModel || 'new') + (modelEdit ? '-e' : '-r')}>
                  {filterModels.length === 0 && !modelDraft ? (
                    <div className="empty">
                      <div className="art">
                        <I n="speaker" size={26} />
                      </div>
                      <b>还没有音箱型号</b>
                      <span>维护各型号音箱的指令与播放配置；设备关联型号后自动生效。</span>
                      <button className="btn primary" onClick={() => selectModel(null)}>
                        <I n="plus" /> 新建
                      </button>
                    </div>
                  ) : selModel && !modelEdit ? (
                    <div className="form-card">
                      <h3>
                        <I n="speaker" size={17} /> 型号详情
                      </h3>
                      <div className="desc">该型号的硬件标识与数字指令；召唤词与播报词由对话角色控制，设备关联后重启生效。</div>
                      {(() => {
                        const mm = models.find((m) => m.id === selModel)
                        return mm?.imageUrl ? (
                          <div className="model-pic">
                            <img className="fade" src={mm.imageUrl} alt={mm.name} onLoad={(e) => e.currentTarget.classList.add('loaded')} onError={(e) => e.currentTarget.classList.add('loaded')} />
                            <span className="pic-tag">{mm.builtin ? '内置型号' : '自定义型号'}</span>
                          </div>
                        ) : null
                      })()}
                      <div className="ro">
                        <div className="rr">
                          <span className="k">型号名称</span>
                          <span className="v">{models.find((m) => m.id === selModel)?.name || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">型号标识</span>
                          <span className="v">{models.find((m) => m.id === selModel)?.did || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">说明</span>
                          <span className="v">{models.find((m) => m.id === selModel)?.desc || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">播放指令</span>
                          <span className="v cmd-row">
                            {(() => {
                              const m = models.find((x) => x.id === selModel)
                              const arr = m?.ttsCommand?.length ? m.ttsCommand.map(String) : ['', '']
                              return arr.slice(0, 2).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                            })()}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">唤醒命令</span>
                          <span className="v cmd-row">
                            {(() => {
                              const m = models.find((x) => x.id === selModel)
                              const arr = m?.wakeUpCommand?.length ? m.wakeUpCommand.map(String) : ['', '']
                              return arr.slice(0, 2).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                            })()}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">播放检测命令</span>
                          <span className="v cmd-row">
                            {(() => {
                              const m = models.find((x) => x.id === selModel)
                              const arr = m?.playingCommand?.length ? m.playingCommand.map(String) : ['', '', '']
                              return arr.slice(0, 3).map((c, i) => <input key={i} className="cmd-input" value={c} disabled placeholder="—" />)
                            })()}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">连续对话</span>
                          <span className="v">
                            <label className="switch">
                              <input type="checkbox" checked={!!models.find((x) => x.id === selModel)?.consecutive} disabled />
                              <span className="track" />
                            </label>
                          </span>
                        </div>
                      </div>
                      <div className="sum">
                        <I n="info" size={14} />
                        {(() => {
                          const used = devices.filter((d) => d.speakerModel === selModel)
                          return used.length ? `被 ${used.map((d) => d.alias).join('、')} 关联 · 关联设备重启后生效` : '未被设备关联 · 可在「设备服务」中选择'
                        })()}
                      </div>
                      <div className="acts">
                        <span className="sp" />
                        <button
                          className="btn danger"
                          disabled={!!models.find((m) => m.id === selModel)?.builtin}
                          onClick={() => delModel(selModel)}
                          title={models.find((m) => m.id === selModel)?.builtin ? '系统内置型号不可删除' : ''}
                        >
                          <I n="trash" /> 删除
                        </button>
                        <button
                          className="btn primary"
                          disabled={!!models.find((m) => m.id === selModel)?.builtin}
                          onClick={() => setModelEdit(true)}
                          title={models.find((m) => m.id === selModel)?.builtin ? '系统内置型号不可编辑' : ''}
                        >
                          <I n="pencil" /> 编辑
                        </button>
                      </div>
                    </div>
                  ) : modelDraft ? (
                    <div className="form-card">
                      <h3>
                        <I n="speaker" size={17} /> {selModel ? '编辑型号' : '新建型号'}
                      </h3>
                      <div className="desc">{selModel ? '修改型号配置；已关联设备重启后生效。' : '维护音箱型号的指令与播放配置；创建后可在「设备服务」中选择。'}</div>                      <div className="fld">
                        <label>型号名称</label>
                        <input value={modelDraft.name} placeholder="例如：小米 AI 音箱第一代" onChange={(e) => setModelDraft({ ...modelDraft, name: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>型号标识</label>
                        <input value={modelDraft.did} placeholder="例如：X08E" onChange={(e) => setModelDraft({ ...modelDraft, did: e.target.value })} />
                        <span className="hint">硬件型号标识（did 前缀），如 X08E、L05B</span>
                      </div>
                      <div className="fld">
                        <label>简介</label>
                        <input value={modelDraft.desc} placeholder="可选" onChange={(e) => setModelDraft({ ...modelDraft, desc: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>图片地址</label>
                        <input value={modelDraft.imageUrl} placeholder="可选，填写设备图片 URL（http/https）" onChange={(e) => setModelDraft({ ...modelDraft, imageUrl: e.target.value })} />
                      </div>
                      {(
                        [
                          ['播放指令', 'ttsCommand', 2, '硬件播放指令数字序列，如 5、1'],
                          ['唤醒命令', 'wakeUpCommand', 2, '硬件唤醒命令数字序列，如 5、1'],
                          ['播放检测命令', 'playingCommand', 3, '查询播放状态命令数字序列，如 3、1、1（部分型号可留空）'],
                        ] as [string, keyof typeof modelDraft, number, string][]
                      ).map(([label, key, count, hint]) => (
                        <div className="fld" key={key as string}>
                          <label>{label}</label>
                          <div className="arr-in">
                            {(modelDraft[key] as string[]).map((v, i) => (
                              <input
                                key={i}
                                className="arr-input"
                                value={v}
                                placeholder={`数字 ${i + 1}`}
                                onChange={(e) => setModelDraft({ ...modelDraft, [key]: (modelDraft[key] as string[]).map((x, j) => (j === i ? e.target.value : x)) })}
                              />
                            ))}
                          </div>
                          <span className="hint">{hint}（{count} 位数字）</span>
                        </div>
                      ))}
                      <div className="fld">
                        <label>连续对话</label>
                        <label className="switch">
                          <input type="checkbox" checked={!!modelDraft.consecutive} onChange={(e) => setModelDraft({ ...modelDraft, consecutive: e.target.checked })} />
                          <span className="track" />
                        </label>
                        <span className="hint">启用后音箱可连续对话，无需每次唤醒</span>
                      </div>
                      <div className="acts">
                        <span className="sp" />
                        <button className="btn ghost" onClick={() => (selModel ? setModelEdit(false) : models.length ? selectModel(models[0].id) : setModelDraft(null))}>
                          取消
                        </button>
                        <button className="btn primary" onClick={saveModel} disabled={!modelDraft.name || !modelDraft.did}>
                          <I n="check" /> 保存
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </section>
          )}

          {view === 'devices' && (
            <section data-view="devices" className="on">
              <div className="filters">
                <span className={'chip' + (devAcctFilter === 'all' ? ' on' : '')} onClick={() => { setDevAcctFilter('all'); selectDev(filterDevices.length ? filterDevices[0].id : null) }}>
                  全部设备
                </span>
                {devAcctGroups.map((g) => (
                  <span key={g.id} className={'chip' + (devAcctFilter === g.id ? ' on' : '')} onClick={() => { setDevAcctFilter(g.id); const first = devices.find((d) => d.accountId === g.id); selectDev(first ? first.id : null) }}>
                    {g.name}
                  </span>
                ))}
                <span className="sp">
                  <span className="count">共 {filterDevices.length} 台</span>
                </span>
              </div>
              <div className="split">
                <aside className="slist">
                  {filterDevices.map((d) => {
                    const r = roles.find((x) => x.id === d.roleId)
                    return (
                      <div key={d.id} className={'li' + (d.id === selDev ? ' on' : '')} onClick={() => selectDev(d.id)}>
                        <span className={'ic' + (d.running ? ' t' : '')}>
                          {(() => {
                            const m = models.find((x) => x.id === d.speakerModel || x.name === d.speakerModel)
                            return m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />
                          })()}
                        </span>
                        <span className="txt">
                          <b>{d.alias}</b>
                          <span>{d.did} · {r?.name || '未指定角色'}</span>
                        </span>
                        <span className={'tag' + (d.running ? ' accent' : ' neu')}>{d.running ? '运行中' : '未启动'}</span>
                      </div>
                    )
                  })}
                  <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => selectDev(null)}>
                    <I n="plus" /> 新建
                  </button>
                </aside>
                <section className="sdetail" key={'dev-' + (selDev || 'new') + (devEdit ? '-e' : '-r')}>
                  {filterDevices.length === 0 && !devDraft ? (
                    <div className="empty">
                      <div className="art">
                        <I n="speaker" size={26} />
                      </div>
                      <b>还没有绑定设备</b>
                      <span>先在「账号设备」接入小米账号，再通过三步向导把音箱绑定到角色与思考服务。</span>
                      <button className="btn primary" onClick={() => selectDev(null)}>
                        <I n="plus" /> 新建
                      </button>
                    </div>
                  ) : selDev && !devEdit ? (
                    <div className="form-card">
                      <h3>
                        <I n="speaker" size={17} /> 设备详情
                      </h3>
                      <div className="desc">设备绑定信息；变更绑定后需重启设备生效。</div>
                      <div className="ro">
                        {(() => {
                          const ref = devices.find((x) => x.id === selDev)?.speakerModel
                          const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                          return m?.imageUrl ? (
                            <div className="model-pic">
                              <img src={m.imageUrl} alt={m.name} />
                              <span className="pic-tag">{m.builtin ? '内置型号' : '自定义型号'}</span>
                            </div>
                          ) : null
                        })()}
                        <div className="rr">
                          <span className="k">设备名称</span>
                          <span className="v">{devices.find((x) => x.id === selDev)?.alias || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备 ID</span>
                          <span className="v">{devices.find((x) => x.id === selDev)?.did || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备型号</span>
                          <span className="v">
                            {(() => {
                              const ref = devices.find((x) => x.id === selDev)?.speakerModel
                              const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                              return m ? `${m.name}（${m.did}）` : ref || '—'
                            })()}
                          </span>
                        </div>
                        <div className="rr">
                          <span className="k">服务状态</span>
                          <span className="v">
                            {(() => {
                              const d = devices.find((x) => x.id === selDev)
                              return d ? (
                                <span className={'tag' + (d.running ? ' accent' : ' neu')}>{d.running ? '运行中' : '未启动'}</span>
                              ) : (
                                '—'
                              )
                            })()}
                          </span>
                        </div>
                        {(() => {
                          const ref = devices.find((x) => x.id === selDev)?.speakerModel
                          const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                          if (!m) return null
                          return (
                            <div className="rr">
                              <span className="k">型号指令</span>
                              <span className="v">
                                {[
                                  m.ttsCommand?.length ? `播放指令：${m.ttsCommand.join('、')}` : null,
                                  m.wakeUpCommand?.length ? `唤醒命令：${m.wakeUpCommand.join('、')}` : null,
                                  m.playingCommand?.length ? `播放检测命令：${m.playingCommand.join('、')}` : null,
                                  m.consecutive ? '连续对话已启用' : '连续对话未启用',
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                          )
                        })()}
                        <div className="rr">
                          <span className="k">云端账号</span>
                          <span className="v">{accounts.find((a) => a.id === devices.find((x) => x.id === selDev)?.accountId)?.name || '默认账号'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">对话角色</span>
                          <span className="v">{roles.find((r) => r.id === devices.find((x) => x.id === selDev)?.roleId)?.name || '未指定'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">服务绑定</span>
                          <span className="v">思考服务 · 语音服务 由对话角色统一提供</span>
                        </div>
                        {(() => {
                          const ref = devices.find((x) => x.id === selDev)?.speakerModel
                          const m = ref ? models.find((x) => x.id === ref || x.name === ref) : null
                          const meta = devices.find((x) => x.id === selDev)
                          if (!m && !meta) return null
                          return (
                            <>
                              <div className="rr">
                                <span className="k">连续对话</span>
                                <span className="v">
                                  {(() => {
                                    if (!m) return '—'
                                    if (!m.consecutive) return '未启用（型号不支持）'
                                    return m.playingCommand?.length ? '启用 · 支持播放状态检测' : '启用 · 依赖 Mina 检测播放状态'
                                  })()}
                                </span>
                              </div>
                              <div className="rr">
                                <span className="k">对话超时</span>
                                <span className="v">{meta?.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
                              </div>
                              <div className="rr">
                                <span className="k">会话群</span>
                                <span className="v">
                                  {(() => {
                                    const meta = devices.find((x) => x.id === selDev)
                                    if (!meta?.roomRef) return '—'
                                    const rm = rooms.find((x) => x.id === meta.roomRef)
                                    return rm ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}` : meta.roomRef
                                  })()}
                                </span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                      <div className="sum">
                        <I n="info" size={14} />
                        {devices.find((x) => x.id === selDev)?.running ? '服务运行中 · 变更绑定后需重启' : '服务未启动 · 变更绑定后需重启'}
                      </div>
                      <div className="acts">
                        <span className="sp" />
                        <button className="btn ghost" onClick={() => restartDevice(selDev)}>
                          <I n="restart" /> {devices.find((x) => x.id === selDev)?.running ? '重启' : '启动'}
                        </button>
                        <button className="btn danger" onClick={removeDeviceForm}>
                          <I n="trash" /> 删除
                        </button>
                        <button className="btn primary" onClick={() => setDevEdit(true)}>
                          <I n="pencil" /> 编辑
                        </button>
                      </div>
                    </div>
                  ) : devDraft ? (
                    <div className="form-card">
                      <h3>
                        <I n="speaker" size={17} /> {selDev ? '编辑设备' : '新建设备'}
                      </h3>
                      <div className="desc">{selDev ? '修改设备绑定；已变更的绑定需重启设备生效。' : '填入音箱 did 与绑定关系；创建后可重启设备生效。'}</div>
                      <div className="fld">
                        <label>设备名称</label>
                        <input value={devDraft.alias} placeholder="例如：客餐厅音箱" onChange={(e) => setDevDraft({ ...devDraft, alias: e.target.value })} />
                      </div>
                      <div className="fld">
                        <label>设备 ID</label>
                        {selDev ? (
                          <input value={devDraft.did} placeholder="例如：小爱音箱Pro" onChange={(e) => setDevDraft({ ...devDraft, did: e.target.value })} />
                        ) : (
                          <div className="ro" style={{ minHeight: 40, alignItems: 'center' }}>
                            <span className="v" style={{ fontSize: 13.5, color: devDraft.did ? 'var(--ink-1)' : 'var(--ink-3)' }}>
                              {devDraft.did || '请先从下方云端账号拉取选择'}
                            </span>
                          </div>
                        )}
                        <span className="hint">小爱音箱 ID 或名称。新建时由「云端账号拉取」自动带入；编辑模式可手动修改。</span>
                      </div>
                      <div className="fld">
                        <label>设备型号</label>
                        <div className="model-pick">
                          <input
                            value={
                              modelPickOpen
                                ? modelPickQ
                                : (() => {
                                    const m = models.find((x) => x.id === devDraft.speakerModel)
                                    return m ? `${m.name}（${m.did}）` : ''
                                  })()
                            }
                            placeholder="输入关键字搜索型号…"
                            onMouseDown={() => { if (!modelPickOpen) setModelPickOpen(true) }}
                            onFocus={() => setModelPickOpen(true)}
                            onBlur={() => setTimeout(() => setModelPickOpen(false), 150)}
                            onChange={(e) => setModelPickQ(e.target.value)}
                          />
                          {modelPickOpen && (
                            <div className="model-pick-list">
                              {(() => {
                                const q = modelPickQ.trim().toLowerCase()
                                const sorted = [...models]
                                  .sort((a, b) => {
                                    if (!!a.builtin !== !!b.builtin) return a.builtin ? -1 : 1
                                    if (a.builtin && b.builtin) return a.name.localeCompare(b.name, 'zh-Hans-CN')
                                    return (a.createdAt || 0) - (b.createdAt || 0)
                                  })
                                  .filter((m) => !q || m.name.toLowerCase().includes(q) || m.did.toLowerCase().includes(q) || m.id.includes(q))
                                return sorted.length ? (
                                  sorted.map((m) => (
                                    <div
                                      key={m.id}
                                      className={'pick-li' + (devDraft.speakerModel === m.id ? ' on' : '')}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        setDevDraft({ ...devDraft, speakerModel: m.id })
                                        setModelPickOpen(false)
                                        setModelPickQ('')
                                      }}
                                    >
                                      {m.imageUrl ? <img src={m.imageUrl} alt="" /> : <span className="ph" />}
                                      <span>{m.name}（{m.did}）</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="pick-empty">未找到匹配型号</div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                        <span className="hint">输入关键字可搜索型号；选择后自动带入该型号的指令与播放配置（可在「设备型号」维护）。</span>
                        {(() => {
                          const m = models.find((x) => x.id === devDraft.speakerModel)
                          if (!m) return null
                          return (
                            <div className="fld-tags">
                              <span><b>播放指令</b>{m.ttsCommand?.length ? m.ttsCommand.join('、') : '—'}</span>
                              <span><b>唤醒命令</b>{m.wakeUpCommand?.length ? m.wakeUpCommand.join('、') : '—'}</span>
                              <span><b>播放检测命令</b>{m.playingCommand?.length ? m.playingCommand.join('、') : '—'}</span>
                              <span><b>连续对话</b>{m.consecutive ? '已启用' : '未启用'}</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="fld">
                        <label>云端账号</label>
                        <select
                          value={devDraft.accountId}
                          onChange={(e) => {
                            setDevDraft({ ...devDraft, accountId: e.target.value, did: '', speakerModel: '' })
                            setDevPull({ loading: false, err: '', list: null })
                          }}
                        >
                          <option value="">未指定（使用默认账号）</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}（{a.miUserId}）
                            </option>
                          ))}
                        </select>
                      </div>
                      {!selDev && (
                        <div className="fld">
                          <label>从账号拉取</label>
                          <div className="pull-dev">
                            <button className="btn" onClick={() => doPullDev(devDraft.accountId)} disabled={!devDraft.accountId || devPull.loading}>
                              <I n="refresh" /> {devPull.loading ? '拉取中…' : '拉取设备列表'}
                            </button>
                            {devPull.err && (
                              <div className="notice err" style={{ marginTop: 8 }}>
                                <I n="warning" size={15} /> {devPull.err}
                              </div>
                            )}
                            {devPull.list && (
                              <div className="pick-list" style={{ marginTop: 8 }}>
                                {devPull.list.map((d) => {
                                  const m = models.find((x) => x.did.toLowerCase() === (d.hardware || '').toLowerCase())
                                  const bound = !!devices.find((x) => x.accountId === devDraft.accountId && x.did === d.miotDID)
                                  return (
                                    <div
                                      className={'pl' + (devDraft.did === d.miotDID ? ' on' : '') + (bound ? ' off' : '')}
                                      key={d.miotDID}
                                      onClick={() => {
                                        if (bound) return
                                        setDevDraft({ ...devDraft, alias: d.name || d.alias, did: d.miotDID, speakerModel: m ? m.id : devDraft.speakerModel })
                                      }}
                                    >
                                      <span className="ic">
                                        <I n="speaker" />
                                      </span>
                                      <span>
                                        <b>{d.name || d.alias}</b>
                                        <span>
                                          {m ? m.name : d.hardware || '未知型号'} · {d.presence === 'online' ? '在线' : '离线'}
                                        </span>
                                      </span>
                                      {bound ? <span className="tag neu">已接入</span> : devDraft.did === d.miotDID && <I n="check" size={18} />}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            <span className="hint">从该云端账号自动拉取小爱音箱（凭小米 ID + passToken，无需密码）；点击选择后自动带入名称、设备 ID 与型号。</span>
                          </div>
                        </div>
                      )}
                      <div className="fld">
                        <label>对话角色</label>
                        <select value={devDraft.roleId} onChange={(e) => setDevDraft({ ...devDraft, roleId: e.target.value })}>
                          <option value="">未指定</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <span className="hint">选择对话角色后，思考服务与语音服务由角色统一提供，无需在此重复配置。</span>
                      </div>
                      <div className="fld">
                        <label>连续对话超时（秒）</label>
                        <input value={devDraft.exitKeepAliveAfter || '30'} placeholder="默认 30" onChange={(e) => setDevDraft({ ...devDraft, exitKeepAliveAfter: e.target.value })} />
                        <span className="hint">连续对话中无响应多久自动退出唤醒模式，默认 30 秒</span>
                      </div>
                      <div className="fld">
                        <label>会话群</label>
                        <select value={devDraft.roomRef} onChange={(e) => setDevDraft({ ...devDraft, roomRef: e.target.value })}>
                          <option value="">未指定</option>
                          {rooms.map((rm) => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name}
                            </option>
                          ))}
                        </select>
                        <span className="hint">对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建</span>
                      </div>
                      {(() => {
                        const m = models.find((x) => x.id === devDraft.speakerModel)
                        if (!m) return null
                        if (!m.consecutive) {
                          return (
                            <div className="notice err">
                              <I n="warning" size={15} /> 此型号不支持连续对话（streamResponse 已禁用）。
                            </div>
                          )
                        }
                        if (!m.playingCommand?.length) {
                          return (
                            <div className="notice">
                              <I n="warning" size={15} /> 此型号未配置播放检测指令，连续对话将依赖 Mina 检测播放状态；若出现异常，可在「设备型号」中补充播放检测指令。
                            </div>
                          )
                        }
                        return null
                      })()}
                      {selDev && (
                        <div className="sum">
                          <I n="info" size={14} />
                          {devices.find((x) => x.id === selDev)?.running ? '服务运行中 · 修改绑定后需重启' : '服务未启动 · 修改绑定后需重启'}
                        </div>
                      )}
                      <div className="acts">
                        <span className="sp" />
                        <button className="btn ghost" onClick={() => (selDev ? setDevEdit(false) : devices.length ? selectDev(devices[0].id) : setDevDraft(null))}>
                          取消
                        </button>
                        <button className="btn primary" onClick={saveDeviceForm} disabled={!devDraft.alias || !devDraft.did}>
                          <I n="check" /> 保存
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </section>
          )}

          {view === 'rooms' && (
            <RoomsView
              rooms={filterRooms}
              allRooms={rooms}
              devices={devices}
              onSave={async (r) => {
                try {
                  await api.updateRoom(r.id, r)
                  showToast('会话群已保存，关联设备重启后生效')
                  refreshAll()
                } catch (e) {
                  showToast(errText(e))
                }
              }}
              onCreate={async (r) => {
                try {
                  const c = await api.createRoom(r)
                  showToast('会话群已创建')
                  await refreshAll()
                  return c
                } catch (e) {
                  showToast(errText(e))
                  return null
                }
              }}
              onDelete={async (id) => {
                if (roomUsage(id).length) {
                  showToast(`该会话群正被设备「${roomUsage(id).join('、')}」引用，请先解除设备绑定`)
                  return
                }
                const r = rooms.find((x) => x.id === id)
                setConfirm({
                  title: '删除会话群',
                  msg: `确定删除「${r?.name || '该会话群'}」吗？删除后不可恢复。`,
                  onOk: async () => {
                    try {
                      await api.deleteRoom(id)
                      showToast('会话群已删除')
                      refreshAll()
                    } catch (e) {
                      showToast(errText(e))
                    }
                  },
                })
              }}
            />
          )}

          {view === 'roles' && <RolesView roles={filterRoles} allRoles={roles} thinkSvcs={thinkSvcs} voiceSvcs={voiceSvcs} roleUsage={roleUsage} onSave={async (r) => { try { await api.updateRole(r.id, r); showToast('角色已保存，人设与模型热生效'); refreshAll() } catch (e) { showToast(errText(e)) } }} onCreate={async (r) => { try { const c = await api.createRole(r); showToast('角色已创建'); await refreshAll(); return c } catch (e) { showToast(errText(e)); return null } }} onDelete={async (id) => { if (roleUsage(id).length) { showToast(`该角色正被 ${roleUsage(id).length} 台设备引用（${roleUsage(id).join('、')}），请先解除设备绑定`); return } const r = roles.find((x) => x.id === id); setConfirm({ title: '删除对话角色', msg: `确定删除「${r?.name || '该角色'}」吗？删除后不可恢复。`, onOk: async () => { try { await api.deleteRole(id); showToast('角色已删除'); refreshAll() } catch (e) { showToast(errText(e)) } } }) }} />}

          {view === 'logs' && <LogsView devices={devices} models={models} />}
          {view === 'syslogs' && <SysLogsView query={query} onToast={showToast} />}

          {(view === 'settings' || view === 'think' || view === 'voice') && (
            <section data-view="settings" className="on">
              {settingTab === 'think' && (
                <>
                  <div className="filters">
                    <span className="chip on">全部服务</span>
                    <span className="sp">
                      <span className="count">共 {thinkSvcs.length} 个</span>
                    </span>
                  </div>
                  <div className="split">
                  <aside className="slist">
                    {thinkSvcs.map((s) => (
                      <div key={s.id} className={'li' + (s.id === selThink ? ' on' : '')} onClick={() => selectThink(s.id)}>
                        <span className="ic t">
                          <I n="bolt" />
                        </span>
                        <span className="txt">
                          <b>{s.name}</b>
                          <span>{PROVIDERS[s.provider] || s.provider} · {s.model}</span>
                        </span>
                        {s.isDefault && <span className="tag">默认</span>}
                      </div>
                    ))}
                    <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => selectThink(null)}>
                      <I n="plus" /> 新建
                    </button>
                  </aside>
                  <section className="sdetail" key={'think-' + (selThink || 'new') + (thinkEdit ? '-e' : '-r')}>
                    {thinkSvcs.length === 0 && !thinkDraft ? (
                      <div className="empty">
                        <div className="art">
                          <I n="bolt" size={26} />
                        </div>
                        <b>还没有思考服务</b>
                        <span>配置模型供应商与端点，作为音箱的「大脑」；配置后可在角色与设备中选择。</span>
                        <button className="btn primary" onClick={() => selectThink(null)}>
                          <I n="plus" /> 新建
                        </button>
                      </div>
                    ) : selThink && !thinkEdit ? (
                      <div className="form-card">
                        <h3>
                          <I n="bolt" size={17} /> 思考服务详情
                        </h3>
                        <div className="desc">音箱「大脑」的模型配置；修改后绑定设备热生效。</div>
                        <div className="ro">
                          <div className="rr">
                            <span className="k">服务名称</span>
                            <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.name || '—'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">供应商</span>
                            <span className="v">{PROVIDERS[thinkSvcs.find((s) => s.id === selThink)?.provider || ''] || thinkSvcs.find((s) => s.id === selThink)?.provider || '—'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">模型端点</span>
                            <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.model || '—'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">API Key</span>
                            <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.apiKey ? '已保存' : '未配置'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">温度</span>
                            <span className="v">{thinkSvcs.find((s) => s.id === selThink)?.temperature ?? 0.7}</span>
                          </div>
                        </div>
                        <div className="sum">
                          <I n="info" size={14} />
                          被 {thinkUsage(selThink)} 台设备引用 · 修改模型 / 温度后热生效
                        </div>
                        <div className="acts">
                          <span className="sp" />
                          <button className="btn danger" onClick={() => delThink(selThink)}>
                            <I n="trash" /> 删除
                          </button>
                          <button className="btn primary" onClick={() => setThinkEdit(true)}>
                            <I n="pencil" /> 编辑
                          </button>
                        </div>
                      </div>
                    ) : thinkDraft ? (
                      <div className="form-card">
                        <h3>
                          <I n="bolt" size={17} /> {selThink ? '编辑思考服务' : '新建思考服务'}
                        </h3>
                        <div className="desc">{selThink ? '修改大脑配置；已绑定设备热生效。' : '配置模型供应商与端点，作为音箱的「大脑」。'}</div>
                        <div className="fld">
                          <label>服务名称</label>
                          <input value={thinkDraft.name} placeholder="例如：豆包 Doubao-Seed" onChange={(e) => setThinkDraft({ ...thinkDraft, name: e.target.value })} />
                        </div>
                        <div className="fld">
                          <label>供应商</label>
                          <select
                            value={thinkDraft.provider}
                            onChange={(e) => {
                              const p = e.target.value
                              const preset = PROVIDER_PRESETS[p]
                              const prev = PROVIDER_PRESETS[thinkDraft.provider]
                              setThinkDraft({
                                ...thinkDraft,
                                provider: p,
                                baseUrl: preset?.baseUrl || '',
                                model: thinkDraft.model && thinkDraft.model !== prev?.model ? thinkDraft.model : preset?.model || '',
                              })
                            }}
                          >
                            {Object.entries(PROVIDERS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="fld">
                          <label>接口地址</label>
                          {thinkDraft.provider === 'custom' ? (
                            <input value={thinkDraft.baseUrl} placeholder="https://api.example.com/v1" onChange={(e) => setThinkDraft({ ...thinkDraft, baseUrl: e.target.value })} />
                          ) : (
                            <input value={thinkDraft.baseUrl || PROVIDER_PRESETS[thinkDraft.provider]?.baseUrl || ''} readOnly disabled placeholder="选择供应商后自动填充" />
                          )}
                          <span className="hint">选「自定义」时可手动填写；其他供应商自动填充官方地址，可随供应商自动带出</span>
                        </div>
                        <div className="fld">
                          <label>模型端点</label>
                          <input value={thinkDraft.model} placeholder="ep-xxxxxxxx 或模型名" onChange={(e) => setThinkDraft({ ...thinkDraft, model: e.target.value })} />
                          <span className="hint">切换供应商自动带出示例模型，可修改</span>
                        </div>
                        <div className="fld">
                          <label>API Key</label>
                          <input value={thinkDraft.apiKey} placeholder={selThink ? '留空则保留原 Key' : 'ark- 开头的密钥'} onChange={(e) => setThinkDraft({ ...thinkDraft, apiKey: e.target.value })} />
                        </div>
                        <div className="fld">
                          <label>温度</label>
                          <input value={thinkDraft.temperature} onChange={(e) => setThinkDraft({ ...thinkDraft, temperature: e.target.value })} />
                          <span className="hint">取值范围 0–1，越高回答越发散</span>
                        </div>
                        <div className="sum">
                          <I n="info" size={14} />
                          {selThink && `被 ${thinkUsage(selThink)} 台设备引用 · `}修改模型 / 温度后热生效
                        </div>
                        <div className="acts">
                          <span className="sp" />
                          <button className="btn ghost" onClick={() => (selThink ? setThinkEdit(false) : thinkSvcs.length ? selectThink(thinkSvcs[0].id) : setThinkDraft(null))}>
                            取消
                          </button>
                          <button className="btn primary" onClick={saveThink} disabled={!thinkDraft.name}>
                            <I n="check" /> 保存
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                  </div>
                </>
              )}

              {settingTab === 'voice' && (
                <>
                  <div className="filters">
                    <span className="chip on">全部服务</span>
                    <span className="sp">
                      <span className="count">共 {voiceSvcs.length} 个</span>
                    </span>
                  </div>
                  <div className="split">
                  <aside className="slist">
                    {voiceSvcs.map((s) => (
                      <div key={s.id} className={'li' + (s.id === selVoice ? ' on' : '')} onClick={() => selectVoice(s.id)}>
                        <span className="ic v">
                          <I n="mic" />
                        </span>
                        <span className="txt">
                          <b>{s.name}</b>
                          <span>{s.builtin ? 'builtin · 全局默认音色' : (TTS_ENGINES[s.provider] || s.provider) + (s.voiceId ? ' · ' + s.voiceId : '')}</span>
                        </span>
                        {s.builtin ? (
                          <span className="tag">内置</span>
                        ) : s.isDefault ? (
                          <span className="tag">默认</span>
                        ) : null}
                      </div>
                    ))}
                    <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => selectVoice(null)}>
                      <I n="plus" /> 新建
                    </button>
                  </aside>
                  <section className="sdetail" key={'voice-' + (selVoice || 'new') + (voiceEdit ? '-e' : '-r')}>
                    {voiceSvcs.length === 0 && !voiceDraft ? (
                      <div className="empty">
                        <div className="art">
                          <I n="mic" size={26} />
                        </div>
                        <b>还没有语音服务</b>
                        <span>接入第三方语音模型，为对话角色提供音色；每个语音服务可含多套音色库。</span>
                        <button className="btn primary" onClick={() => selectVoice(null)}>
                          <I n="plus" /> 新建
                        </button>
                      </div>
                    ) : selVoice && !voiceEdit ? (
                      <div className="form-card">
                        <h3>
                          <I n="mic" size={17} /> 语音服务详情
                        </h3>
                        <div className="desc">为对话角色提供音色的配置；修改后绑定设备支持热切。</div>
                        <div className="ro">
                          <div className="rr">
                            <span className="k">服务名称</span>
                            <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.name || '—'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">供应商</span>
                            <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.builtin ? '默认语音' : TTS_ENGINES[voiceSvcs.find((s) => s.id === selVoice)?.provider || ''] || voiceSvcs.find((s) => s.id === selVoice)?.provider || '—'}</span>
                          </div>
                          <div className="rr">
                            <span className="k">音色 ID</span>
                            <span className="v">{voiceSvcs.find((s) => s.id === selVoice)?.voiceId || '默认音色'}</span>
                          </div>
                        </div>
                        <div className="sum">
                          <I n="info" size={14} />
                          被 {voiceUsage(selVoice)} 台设备引用 · 支持热切「把声音换成…」
                        </div>
                        <div className="acts">
                          <span className="sp" />
                          <button className="btn danger" disabled={!!selVoiceObj?.builtin} onClick={() => delVoice(selVoice)} title={selVoiceObj?.builtin ? '内置语音服务不可删除' : ''}>
                            <I n="trash" /> 删除
                          </button>
                          <button className="btn primary" disabled={!!selVoiceObj?.builtin} onClick={() => setVoiceEdit(true)} title={selVoiceObj?.builtin ? '内置语音服务不可编辑' : ''}>
                            <I n="pencil" /> 编辑
                          </button>
                        </div>
                      </div>
                    ) : voiceDraft ? (
                      <div className="form-card">
                        <h3>
                          <I n="mic" size={17} /> {selVoice ? '编辑语音服务' : '新建语音服务'}
                        </h3>
                        <div className="desc">{selVoice ? '修改音色配置；已绑定设备支持热切。' : '接入第三方语音模型，为对话角色提供音色。'}</div>
                        <div className="fld">
                          <label>服务名称</label>
                          <input value={voiceDraft.name} placeholder="例如：豆包语音" onChange={(e) => setVoiceDraft({ ...voiceDraft, name: e.target.value })} />
                        </div>
                        <div className="fld">
                          <label>供应商</label>
                          <select value={voiceDraft.provider} onChange={(e) => setVoiceDraft({ ...voiceDraft, provider: e.target.value })}>
                            {Object.entries(TTS_ENGINES)
                              .filter(([k]) => k !== 'builtin')
                              .map(([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="fld">
                          <label>音色 ID</label>
                          <input value={voiceDraft.voiceId} placeholder="例如：zh-CN-XiaoxiaoNeural" onChange={(e) => setVoiceDraft({ ...voiceDraft, voiceId: e.target.value })} />
                          <span className="hint">留空使用该引擎的默认音色</span>
                        </div>
                        {voiceDraft.provider === 'edge' && (
                          <div className="fld">
                            <label>访问令牌（可选）</label>
                            <input value={voiceDraft.edgeToken} placeholder="留空由 Edge 自动获取" onChange={(e) => setVoiceDraft({ ...voiceDraft, edgeToken: e.target.value })} />
                            <span className="hint">Edge 大声朗读为免费服务，一般无需填写</span>
                          </div>
                        )}
                        {voiceDraft.provider === 'volcano' && (
                          <>
                            <div className="fld">
                              <label>App ID</label>
                              <input value={voiceDraft.volcanoAppId} placeholder="火山引擎语音合成 App ID" onChange={(e) => setVoiceDraft({ ...voiceDraft, volcanoAppId: e.target.value })} />
                            </div>
                            <div className="fld">
                              <label>访问令牌</label>
                              <input value={voiceDraft.volcanoToken} placeholder="火山引擎 Access Token" onChange={(e) => setVoiceDraft({ ...voiceDraft, volcanoToken: e.target.value })} />
                            </div>
                          </>
                        )}
                        {voiceDraft.provider === 'openai' && (
                          <>
                            <div className="fld">
                              <label>API Key</label>
                              <input value={voiceDraft.openaiKey} placeholder="OpenAI API Key" onChange={(e) => setVoiceDraft({ ...voiceDraft, openaiKey: e.target.value })} />
                            </div>
                            <div className="fld">
                              <label>模型（可选）</label>
                              <input value={voiceDraft.openaiModel} placeholder="tts-1" onChange={(e) => setVoiceDraft({ ...voiceDraft, openaiModel: e.target.value })} />
                              <span className="hint">留空使用 tts-1</span>
                            </div>
                            <div className="fld">
                              <label>接口地址（可选）</label>
                              <input value={voiceDraft.openaiBaseUrl} placeholder="https://api.openai.com/v1" onChange={(e) => setVoiceDraft({ ...voiceDraft, openaiBaseUrl: e.target.value })} />
                              <span className="hint">支持任意 OpenAI 兼容 TTS 端点</span>
                            </div>
                          </>
                        )}
                        {voiceDraft.provider === 'custom' && (
                          <div className="fld">
                            <label>TTS 配置（JSON）</label>
                            <textarea value={voiceDraft.customJson} placeholder='{"edge":{"trustedToken":"…"}}' onChange={(e) => setVoiceDraft({ ...voiceDraft, customJson: e.target.value })} rows={5} />
                            <span className="hint">高级用法：直接填写 mi-gpt TTSConfig JSON</span>
                          </div>
                        )}
                        <div className="sum">
                          <I n="info" size={14} />
                          {selVoice && `被 ${voiceUsage(selVoice)} 台设备引用 · `}支持热切「把声音换成…」
                        </div>
                        <div className="acts">
                          <span className="sp" />
                          <button className="btn ghost" onClick={() => (selVoice ? setVoiceEdit(false) : voiceSvcs.length ? selectVoice(voiceSvcs[0].id) : setVoiceDraft(null))}>
                            取消
                          </button>
                          <button className="btn primary" onClick={saveVoice} disabled={!voiceDraft.name}>
                            <I n="check" /> 保存
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                  </div>
                </>
              )}
            </section>
          )}

          {view === 'profile' && (
            <section data-view="profile" className="on">
              <div className="profile">
                <div className="pset">
                  <div className="pcard-block">
                    <h4>账号信息</h4>
                    <div className="pcard-set">
                      <div className="pi">
                        <span className="lbl">登录账号</span>
                        <span className="val">admin</span>
                      </div>
                      <div className="pi">
                        <span className="lbl">身份</span>
                        <span className="val">超级管理员</span>
                      </div>
                      <div className="pi click" onClick={() => setModal({ kind: 'pwd', title: '修改登录密码', desc: '默认密码为部署时设定；修改后立即生效。' })}>
                        <span className="lbl">修改密码</span>
                        <span className="val">立即修改 ›</span>
                      </div>
                    </div>
                  </div>
                  <div className="pcard-block">
                    <h4>基础设置</h4>
                    <div className="pcard-set">
                      <div className="pi">
                        <span className="lbl">界面语言</span>
                        <span className="val">简体中文</span>
                      </div>
                      <div className="pi">
                        <span className="lbl">时区</span>
                        <span className="val">UTC+8 · 中国标准时间</span>
                      </div>
                      <div className="pi">
                        <span className="lbl">主题模式</span>
                        <span className="val muted">浅色</span>
                      </div>
                    </div>
                  </div>
                  <div className="pcard-block">
                    <h4>通知与安全</h4>
                    <div className="pcard-set">
                      <div className="pi">
                        <span className="lbl">
                          设备异常提醒
                          <small>设备离线或服务异常时推送通知</small>
                        </span>
                        <span className="val">
                          <span className="sw off" />
                        </span>
                      </div>
                      <div className="pi">
                        <span className="lbl">
                          双重验证
                          <small>登录时需要额外验证码</small>
                        </span>
                        <span className="val">
                          <span className="sw off" />
                        </span>
                      </div>
                      <div className="pi">
                        <span className="lbl">
                          登录认证
                          <small>面板访问需要账号密码</small>
                        </span>
                        <span className="val">
                          <span className="sw on" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pcard-block">
                    <h4>其他</h4>
                    <div className="pcard-set">
                      <div className="pi">
                        <span className="lbl">版本信息</span>
                        <span className="val">v1.12.0</span>
                      </div>
                      <div className="pi click danger" onClick={doLogout}>
                        <span className="lbl">退出登录</span>
                        <span className="val">立即退出 ›</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 设备详情抽屉 */}
      {detail && (
        <Drawer
          detail={detail}
          running={devices.find((x) => x.id === detail.meta.id)?.running}
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          accounts={accounts}
          models={models}
          rooms={rooms}
          onClose={closeDrawer}
          onRestart={() => restartDevice(detail.meta.id)}
          onRemove={async () => {
            if (!window.confirm(`解绑设备「${detail.meta.alias}」？此操作不可撤销。`)) return
            await removeDevice(detail.meta.id)
          }}
          onEdit={() => setModal({ kind: 'deviceBind', title: '编辑绑定', desc: '修改这台音箱的角色与服务绑定；换绑账号 / 唤醒词需重启设备。', payload: detail.meta })}
        />
      )}

      {/* 弹窗 */}
      {modal && (
        <ModalShell
          modal={modal}
          accounts={accounts}
          roles={roles}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          models={models}
          rooms={rooms}
          onClose={() => setModal(null)}
          onDone={async (values) => {
          const m = modal
          setModal(null)
          try {
            if (m.kind === 'account') {
              const payload = (m.payload || {}) as Account
              if (payload.id) {
                await api.updateAccount(payload.id, values as Partial<Account>)
                showToast('账号已更新，换绑账号需重启受影响设备')
              } else {
                await api.createAccount(values as Partial<Account>)
                showToast('账号已连接')
              }
              refreshAll()
            } else if (m.kind === 'think') {
              const payload = (m.payload || {}) as ThinkService
              if (payload.id) {
                await api.updateThinkService(payload.id, values as Partial<ThinkService>)
                showToast('思考服务已更新，热生效')
              } else {
                await api.createThinkService(values as Partial<ThinkService>)
                showToast('思考服务已创建')
              }
              refreshAll()
            } else if (m.kind === 'voice') {
              const payload = (m.payload || {}) as VoiceService
              if (payload.id) {
                await api.updateVoiceService(payload.id, values as Partial<VoiceService>)
                showToast('语音服务已更新，音色热切')
              } else {
                await api.createVoiceService(values as Partial<VoiceService>)
                showToast('语音服务已创建')
              }
              refreshAll()
            } else if (m.kind === 'role') {
              const payload = (m.payload || {}) as Role
              if (payload.id) {
                await api.updateRole(payload.id, values as Partial<Role>)
                showToast('角色已保存，人设热生效')
              } else {
                await api.createRole(values as Partial<Role>)
                showToast('角色已创建')
              }
              refreshAll()
            } else if (m.kind === 'pwd') {
              await api.changeAuth('admin', (values as { old: string }).old, 'admin', (values as { pwd: string }).pwd)
              showToast('密码已修改，下次登录生效')
            } else if (m.kind === 'deviceBind') {
              const meta = (m.payload || {}) as api.DeviceMeta
              await api.saveDevice(meta.id, { meta: values as Partial<api.DeviceMeta> })
              showToast('绑定已更新，需重启设备生效')
              refreshAll()
              if (detail) openDevice(meta.id)
            }
          } catch (e) {
            showToast(errText(e))
          }
        }} />
      )}

      {/* 三步向导 */}
      {wizard && (
        <Wizard
          step={wizard.step}
          accounts={accounts}
          roles={roles}
          models={models}
          thinkSvcs={thinkSvcs}
          voiceSvcs={voiceSvcs}
          draft={wizard}
          setDraft={(p) => setWizard({ ...wizard, ...p })}
          onClose={() => setWizard(null)}
          onNewAccount={async (d) => {
            const created = await api.createAccount(d)
            await refreshAll()
            return created
          }}
          onUpdateAccount={async (id, d) => {
            const u = await api.updateAccount(id, d as Partial<Account>)
            await refreshAll()
            return u
          }}
          onNewRole={async (d) => {
            const created = await api.createRole(d)
            await refreshAll()
            return created
          }}
          onUpdateRole={async (id, d) => {
            const u = await api.updateRole(id, d as Partial<Role>)
            await refreshAll()
            return u
          }}
          devices={devices}
          onFinish={async () => {
            try {
              const created = await api.createDevice({
                alias: wizard.alias,
                did: wizard.did,
                speakerModel: wizard.model || undefined,
                roleId: wizard.roleId || undefined,
                accountId: wizard.accountId || undefined,
              })
              await api.startDevice(created.id)
              showToast('设备已添加并启动')
              setWizard(null)
              refreshAll()
            } catch (e) {
              showToast(errText(e))
            }
          }}
        />
      )}

      {/* 删除确认 */}
      {confirm && (
        <>
          <div className={'scrim on' + (confirmLeaving ? ' closing' : '')} onClick={() => closeConfirm()} />
          <div className={'modal on' + (confirmLeaving ? ' closing' : '')}>
            <h3>
              <I n="trash" size={18} /> {confirm.title}
            </h3>
            <div className="desc">{confirm.msg}</div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={() => closeConfirm()}>
                取消
              </button>
              <button className="btn danger" onClick={() => closeConfirm(true)}>
                <I n="trash" /> 删除
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <div className={'toast' + (toast ? ' on' : '')}>
        <I n="check" size={15} />
        <span>
          <b>{toast}</b>
        </span>
      </div>
    </div>
  )
}

/* ══ 角色视图 ══ */
function LogsView(props: { devices: DeviceRow[]; models: SpeakerModel[] }) {
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [devFilter, setDevFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | 'user' | 'ai' | 'system'>('all')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    setBusy(true)
    api
      .getLogs(300)
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]))
      .finally(() => setBusy(false))
  }, [])
  useEffect(load, [load])
  const list = useMemo(() => {
    if (!logs) return null
    return logs.filter(
      (l) =>
        (devFilter === 'all' || l.deviceId === devFilter) &&
        (kindFilter === 'all' || l.kind === kindFilter),
    )
  }, [logs, devFilter, kindFilter])
  const kindLabel = { user: '用户提问', ai: '设备回复', system: '设备日志' } as const
  const deviceById = (id: string) => props.devices.find((d) => d.id === id)
  const selDevName = devFilter === 'all' ? '全部设备' : deviceById(devFilter)?.alias || devFilter
  return (
    <section data-view="logs" className="on">
      <div className="split">
        <aside className="slist">
          <div className="filters">
            <span className={'chip' + (devFilter === 'all' ? ' on' : '')} onClick={() => setDevFilter('all')}>
              全部设备
            </span>
            <span className="sp">
              <span className="count">共 {props.devices.length} 台</span>
            </span>
          </div>
          {props.devices.map((d) => {
            const m = props.models.find((x) => x.id === d.speakerModel || x.name === d.speakerModel)
            return (
              <div key={d.id} className={'li' + (devFilter === d.id ? ' on' : '')} onClick={() => setDevFilter(d.id)}>
                <span className="ic">
                  {m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />}
                </span>
                <span className="txt">
                  <b>{d.alias}</b>
                  <span>{d.did}</span>
                </span>
                <span className="count">{logs ? logs.filter((l) => l.deviceId === d.id).length : 0} 条</span>
              </div>
            )
          })}
        </aside>
        <section className="sdetail" key={'logs-' + devFilter + '-' + kindFilter}>
          <div className="filters">
            <span className={'chip' + (kindFilter === 'all' ? ' on' : '')} onClick={() => setKindFilter('all')}>
              全部对话
            </span>
            <span className={'chip' + (kindFilter === 'user' ? ' on' : '')} onClick={() => setKindFilter('user')}>
              用户提问
            </span>
            <span className={'chip' + (kindFilter === 'ai' ? ' on' : '')} onClick={() => setKindFilter('ai')}>
              设备回复
            </span>
            <span className={'chip' + (kindFilter === 'system' ? ' on' : '')} onClick={() => setKindFilter('system')}>
              设备日志
            </span>
            <span className="sp" />
            <button className="icon-btn" title="刷新" disabled={busy} onClick={load}>
              <I n="refresh" size={16} />
            </button>
          </div>

          {list === null ? (
            <div className="panel">
              <div className="loading">
                <div className="skel" />
                <div className="skel" />
                <div className="skel" />
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="panel">
              <div className="empty">
                <div className="art">
                  <I n="log" size={26} />
                </div>
                <b>{logs && logs.length === 0 ? '还没有对话记录' : '没有符合条件的记录'}</b>
                <span>
                  {logs && logs.length === 0
                    ? '唤醒音箱开始对话后，这里会按时间记录每台音箱的问答，方便你复盘每次交互。'
                    : '换一个筛选条件，或点击右上角刷新。'}
                </span>
              </div>
            </div>
          ) : (
            <div className="logs">
              {list.map((l, i) => (
                <div className={'log' + (l.kind === 'user' ? ' q' : l.kind === 'ai' ? ' a' : '')} key={i}>
                  <span className="t">{l.time || '--'}</span>
                  <span className="who">
                    <span className="tag accent">{selDevName}</span>
                    <em className={'k k-' + l.kind}>{kindLabel[l.kind]}</em>
                  </span>
                  <span className="txt">{l.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function SysLogsView(props: { query?: string; onToast?: (msg: string) => void }) {
  const [lines, setLines] = useState<string[] | null>(null)
  const [live, setLive] = useState(true)
  const [askClear, setAskClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const load = useCallback(() => {
    api
      .getSystemLogs(400)
      .then((r) => {
        setLines(r.lines)
      })
      .catch(() => setLines([]))
  }, [])
  useEffect(() => {
    load()
    if (!live) return
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load, live])
  useEffect(() => {
    const el = boxRef.current
    if (el && lines) el.scrollTop = el.scrollHeight
  }, [lines])
  const q = (props.query || '').trim().toLowerCase()
  const shown = useMemo(
    () => (lines ? lines.filter((l) => !q || l.toLowerCase().includes(q)) : null),
    [lines, q],
  )
  const levelOf = (line: string) =>
    /\[ERROR\]/.test(line) ? 'err' : /\[WARN\]/.test(line) ? 'warn' : 'info'
  return (
    <section data-view="syslogs" className="on">
      <div className="syslog">
        <div className="filters">
          <label className="switch-inline" title="开启后每 2 秒自动刷新最新日志；关闭即暂停实时日志，保留当前画面">
            <span className="k">自动刷新</span>
            <span className="switch">
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
              <span className="track" />
            </span>
          </label>
          <span className="sp" />
          <button className="btn ghost danger" onClick={() => setAskClear(true)} disabled={clearing}>
            <I n="trash" /> 清理日志
          </button>
          <button className="btn" onClick={() => api.downloadSystemLogs()}>
            <I n="download" /> 下载日志
          </button>
        </div>
        <div className="syslog-box" ref={boxRef}>
          {shown === null ? (
            <div className="syslog-empty">正在加载日志…</div>
          ) : shown.length === 0 ? (
            <div className="syslog-empty">{q ? '没有匹配的日志行' : '暂无系统日志'}</div>
          ) : (
            shown.map((l, i) => (
              <div className={'syslog-line ' + levelOf(l)} key={i}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>
      {askClear && (
        <>
          <div className="scrim on" onClick={() => setAskClear(false)} />
          <div className="modal on">
            <h3>
              <I n="trash" size={18} /> 清理系统日志
            </h3>
            <div className="desc">
              将删除全部历史日志数据，并清空实时日志内容，此操作无法恢复。是否继续？
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={() => setAskClear(false)}>
                取消
              </button>
              <button
                className="btn danger"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true)
                  try {
                    await api.clearSystemLogs()
                    setLines([])
                    setAskClear(false)
                    props.onToast?.('系统日志已清理')
                  } catch (e) {
                    props.onToast?.(e instanceof Error ? e.message : String(e))
                  } finally {
                    setClearing(false)
                  }
                }}
              >
                <I n="trash" /> 清理
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function RoomsView(props: {
  rooms: Room[]
  allRooms: Room[]
  devices: DeviceRow[]
  onSave: (r: Room) => void
  onCreate: (r: Partial<Room>) => Promise<Room | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.rooms[0]?.id || null)
  const sel = props.allRooms.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<{ name: string; description: string }>({ name: sel?.name || '', description: sel?.description || '' })
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
    setEdit(false)
  }, [selId, sel?.name, sel?.description])
  const startCreate = () => {
    setSelId(null)
    setDraft({ name: '', description: '' })
    setEdit(true)
    setCreating(true)
  }
  const cancel = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (props.allRooms.length) setSelId(props.allRooms[0].id)
      else setDraft({ name: '', description: '' })
      return
    }
    setEdit(false)
    setDraft({ name: sel?.name || '', description: sel?.description || '' })
  }
  const save = async () => {
    const name = draft.name.trim()
    if (!name) {
      window.alert('会话群名称必填')
      return
    }
    if (creating) {
      const created = await props.onCreate({ name, description: draft.description.trim() || undefined })
      if (created) {
        setCreating(false)
        setEdit(false)
        setSelId(created.id)
      }
      return
    }
    if (sel) {
      props.onSave({ ...sel, name, description: draft.description.trim() || undefined })
      setEdit(false)
    }
  }
  return (
    <section data-view="rooms" className="on">
      <div className="filters">
        <span className="chip on">全部会话群</span>
        <span className="sp">
          <span className="count">共 {props.rooms.length} 个</span>
        </span>
      </div>
      <div className="split">
        <aside className="slist">
          {props.rooms.map((r) => {
            const used = props.devices.filter((d) => d.roomRef === r.id).length
            return (
              <div key={r.id} className={'li' + (r.id === selId ? ' on' : '')} onClick={() => { setSelId(r.id); setEdit(false) }}>
                <span className="ic">
                  <I n="users" />
                </span>
                <span className="txt">
                  <b>{r.name}</b>
                  <span>{r.description || '无描述'}</span>
                </span>
                {used ? <span className="tag accent">{used} 台共用</span> : <span className="tag neu">未关联</span>}
              </div>
            )
          })}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={startCreate}>
            <I n="plus" /> 新建
          </button>
        </aside>
        <section className="sdetail" key={'room-' + (selId || 'new') + (edit ? '-e' : '-r')}>
          {props.rooms.length === 0 && !creating ? (
            <div className="empty">
              <div className="art">
                <I n="users" size={26} />
              </div>
              <b>还没有会话群</b>
              <span>会话群是对话记忆的上下文归属，多台设备可共用同一会话群；创建后在「设备服务」中关联。</span>
              <button className="btn primary" onClick={startCreate}>
                <I n="plus" /> 新建
              </button>
            </div>
          ) : edit ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} /> {creating ? '新建会话群' : '编辑会话群'}
              </h3>
              <div className="desc">{creating ? '创建后可到「设备服务」中为音箱关联此会话群。' : '修改会话群信息；关联设备重启后生效。'}</div>
              <div className="fld">
                <label>会话群名称</label>
                <input value={draft.name} placeholder="例如：客厅会话" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="fld">
                <label>会话群描述</label>
                <input value={draft.description} placeholder="例如：家庭日常闲聊场景" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn ghost" onClick={cancel}>
                  取消
                </button>
                <button className="btn primary" onClick={save} disabled={!draft.name.trim()}>
                  <I n="check" /> 保存
                </button>
              </div>
            </div>
          ) : sel ? (
            <div className="form-card">
              <h3>
                <I n="users" size={17} /> 会话群详情
              </h3>
              <div className="desc">对话记忆的上下文归属；被设备引用后删除前需先解绑。</div>
              <div className="ro">
                <div className="rr">
                  <span className="k">会话群名称</span>
                  <span className="v">{sel.name}</span>
                </div>
                <div className="rr">
                  <span className="k">会话群描述</span>
                  <span className="v">{sel.description || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">关联设备</span>
                  <span className="v">
                    {(() => {
                      const used = props.devices.filter((d) => d.roomRef === sel.id)
                      return used.length ? used.map((d) => d.alias).join('、') : '未关联'
                    })()}
                  </span>
                </div>
              </div>
              <div className="sum">
                <I n="info" size={14} />
                多台设备共用同一会话群，共享对话记忆；变更后需重启关联设备生效。
              </div>
              <div className="acts">
                <span className="sp" />
                <button className="btn danger" onClick={() => props.onDelete(sel.id)}>
                  <I n="trash" /> 删除
                </button>
                <button className="btn primary" onClick={() => { setDraft({ name: sel.name, description: sel.description || '' }); setEdit(true) }}>
                  <I n="pencil" /> 编辑
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}

function RolesView(props: {
  roles: Role[]
  allRoles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  roleUsage: (id: string) => string[]
  onSave: (r: Role) => void
  onCreate: (r: Partial<Role>) => Promise<Role | null> | void
  onDelete: (id: string) => void
}) {
  const [selId, setSelId] = useState<string | null>(props.roles[0]?.id || null)
  const sel = props.allRoles.find((r) => r.id === selId) || null
  const [draft, setDraft] = useState<Role | null>(sel)
  const [edit, setEdit] = useState(false)
  const [creating, setCreating] = useState(false)
  const thinkDefault = props.thinkSvcs.find((s) => s.isDefault)
  const voiceDefault = props.voiceSvcs.find((s) => s.isDefault)
  const blankRole = (): Role => ({
    id: '',
    name: '',
    profile: '',
    callAIKeywords: [],
    wakeUpKeywords: ['小爱同学'],
    exitKeywords: [],
    checkContinueKeywords: [],
    checkNotContinueKeywords: [],
    exitKeepAliveAfter: 30,
    onEnterAI: [],
    onExitAI: [],
    onAIAsking: [],
    onAIReplied: [],
    onAIError: [],
  })
  useEffect(() => {
    setSelId((s) => s || props.roles[0]?.id || null)
  }, [props.roles])
  useEffect(() => {
    if (!creating) setDraft(sel)
  }, [selId, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Role, v: unknown) => draft && setDraft({ ...draft, [k]: v })
  const usage = sel ? props.roleUsage(sel.id) : []

  const selectRole = (id: string) => {
    setSelId(id)
    setCreating(false)
    setEdit(false)
  }
  const startCreate = () => {
    setSelId(null)
    setCreating(true)
    setEdit(true)
    setDraft(blankRole())
  }
  const cancelEdit = () => {
    if (creating) {
      setCreating(false)
      setEdit(false)
      if (!sel) setSelId(props.roles[0]?.id || null)
      else setDraft(sel)
    } else {
      setEdit(false)
    }
  }
  const doSave = async () => {
    if (!draft) return
    if (creating) {
      const c = await props.onCreate({ ...draft })
      if (c?.id) {
        setSelId(c.id)
        setCreating(false)
        setEdit(false)
      }
    } else {
      props.onSave(draft)
      setEdit(false)
    }
  }

  if (props.roles.length === 0) {
    return (
      <section data-view="roles" className="on">
        <div className="panel">
          <div className="empty">
            <div className="art">
              <I n="chat" size={26} />
            </div>
            <b>还没有对话角色</b>
            <span>创建角色后，可在设备向导中为每台音箱选择人设。</span>
            <button className="btn primary" onClick={startCreate}>
              <I n="plus" /> 新建
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section data-view="roles" className="on">
      <div className="filters">
        <span className="chip on">全部角色</span>
        <span className="sp">
          <span className="count">共 {props.roles.length} 个</span>
        </span>
      </div>
      <div className="roles">
        <div className="rlist">
          {props.roles.map((r) => (
            <div className={'r' + (r.id === selId ? ' on' : '')} key={r.id} onClick={() => selectRole(r.id)}>
              <img src={avatarOf(r.name)} alt={r.name} />
              <span>
                <b>{r.name}</b>
                <span>{r.profile?.slice(0, 18) || '未填写人设'}</span>
              </span>
            </div>
          ))}
          <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={startCreate}>
            <I n="plus" /> 新建
          </button>
        </div>
        {sel && !edit && !creating && (
          <div className="rform" key={'role-r-' + sel.id}>
            <h3>
              <I n="chat" size={17} /> 角色详情
            </h3>
            <div className="ro">
              <div className="grp">
                <h4>基本信息</h4>
                <div className="rr">
                  <span className="k">角色名称</span>
                  <span className="v">{sel.name || '—'}</span>
                </div>
                <div className="rr">
                  <span className="k">人设描述</span>
                  <span className="v">{sel.profile || '未填写'}</span>
                </div>
              </div>
              <div className="grp">
                <h4>模型服务</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">思考服务</span>
                    <span className="v">{props.thinkSvcs.find((s) => s.id === sel.thinkServiceId)?.name || '跟随全局默认'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">语音服务</span>
                    <span className="v">{props.voiceSvcs.find((s) => s.id === sel.voiceId)?.name || '跟随全局默认'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>单次对话</h4>
                <div className="rr">
                  <span className="k">调用关键词</span>
                  <span className="v">{(sel.callAIKeywords || []).join('、') || '—'}</span>
                </div>
              </div>
              <div className="grp">
                <h4>连续对话</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">唤醒关键词</span>
                    <span className="v">{(sel.wakeUpKeywords || []).join('、') || '小爱同学'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">退出关键词</span>
                    <span className="v">{(sel.exitKeywords || []).join('、') || '—'}</span>
                  </div>
                </div>
                <div className="rr">
                  <span className="k">自动退出时间</span>
                  <span className="v">{sel.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">继续对话检测</span>
                    <span className="v">{(sel.checkContinueKeywords || []).join('、') || '—'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">停止对话检测</span>
                    <span className="v">{(sel.checkNotContinueKeywords || []).join('、') || '—'}</span>
                  </div>
                </div>
              </div>
              <div className="grp">
                <h4>提示语</h4>
                <div className="row">
                  <div className="rr">
                    <span className="k">进入 AI</span>
                    <span className="v">{(sel.onEnterAI || []).join('、') || '关闭'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">退出 AI</span>
                    <span className="v">{(sel.onExitAI || []).join('、') || '关闭'}</span>
                  </div>
                </div>
                <div className="row">
                  <div className="rr">
                    <span className="k">AI 思考中</span>
                    <span className="v">{(sel.onAIAsking || []).join('、') || '关闭'}</span>
                  </div>
                  <div className="rr">
                    <span className="k">AI 回答完毕</span>
                    <span className="v">{(sel.onAIReplied || []).join('、') || '关闭'}</span>
                  </div>
                </div>
                <div className="rr">
                  <span className="k">AI 出错</span>
                  <span className="v">{(sel.onAIError || []).join('、') || '关闭'}</span>
                </div>
              </div>
            </div>
            <div className="sum">
              <I n="info" size={14} />
              本角色被 {usage.length} 台设备引用{usage.length ? '（' + usage.join(' · ') + '）' : ''}。人设与模型热生效；修改唤醒词需重启设备。
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn danger" onClick={() => props.onDelete(sel.id)}>
                <I n="trash" /> 删除
              </button>
              <button className="btn primary" onClick={() => setEdit(true)}>
                <I n="pencil" /> 编辑
              </button>
            </div>
          </div>
        )}
        {draft && (edit || creating) && (
          <div className="rform redit" key={'role-e-' + (creating ? 'new' : sel?.id || 'new')}>
            <h3>
              <I n="chat" size={17} /> {creating ? '新建角色' : '编辑角色'}
              <span className="refs">
                本角色被 {usage.length} 台设备引用{usage.length ? '（' + usage.join(' · ') + '）' : ''}。人设与模型热生效；修改唤醒词需重启设备。
              </span>
            </h3>
            <div className="grp">
              <h4>基本信息</h4>
              <div className="row">
                <div className="fld">
                  <label>角色名称</label>
                  <input value={draft.name} onChange={(e) => setF('name', e.target.value)} />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>人设描述<span className="tip" data-tip="供思考服务理解人格 · 热生效">?</span></label>
                  <textarea value={draft.profile} onChange={(e) => setF('profile', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>模型服务</h4>
              <div className="row">
                <div className="fld">
                  <label>思考服务</label>
                  <select value={draft.thinkServiceId || ''} onChange={(e) => setF('thinkServiceId', e.target.value || undefined)}>
                    <option value="">（跟随全局默认：{thinkDefault?.name || '未设置'}）</option>
                    {props.thinkSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>语音服务</label>
                  <select value={draft.voiceId || ''} onChange={(e) => setF('voiceId', e.target.value || undefined)}>
                    <option value="">（跟随全局默认：{voiceDefault?.name || '未设置'}）</option>
                    {props.voiceSvcs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>单次对话</h4>
              <div className="row">
                <div className="fld">
                  <label>调用关键词<span className="tip" data-tip="每次提问都需以「小爱同学 + 调用词」开头，不会进入连续对话">?</span></label>
                  <input
                    value={(draft.callAIKeywords || []).join('、')}
                    onChange={(e) => setF('callAIKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>连续对话</h4>
              <div className="row">
                <div className="fld">
                  <label>唤醒关键词<span className="tip" data-tip="唤醒后免唤醒词连续对话 · 修改后需重启绑定该设备的设备">?</span></label>
                  <input
                    value={(draft.wakeUpKeywords || []).join('、')}
                    onChange={(e) => setF('wakeUpKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>退出关键词<span className="tip" data-tip="说出退出词即结束连续对话；留空时用唤醒词再唤回或等待超时">?</span></label>
                  <input
                    value={(draft.exitKeywords || []).join('、')}
                    onChange={(e) => setF('exitKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>自动退出时间<span className="tip" data-tip="连续对话中无响应超过该秒数自动退出，默认 30 秒">?</span></label>
                  <input value={String(draft.exitKeepAliveAfter ?? 30)} placeholder="默认 30" onChange={(e) => setF('exitKeepAliveAfter', parseInt(e.target.value || '30', 10) || 30)} />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>继续对话检测<span className="tip" data-tip="说出继续词可保持连续对话；超时退出后再说出可重新进入">?</span></label>
                  <input
                    value={(draft.checkContinueKeywords || []).join('、')}
                    onChange={(e) => setF('checkContinueKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>停止对话检测<span className="tip" data-tip="说出停止词立即结束连续对话，等效于退出关键词">?</span></label>
                  <input
                    value={(draft.checkNotContinueKeywords || []).join('、')}
                    onChange={(e) => setF('checkNotContinueKeywords', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="grp">
              <h4>提示语</h4>
              <div className="row">
                <div className="fld">
                  <label>进入 AI<span className="tip" data-tip="进入连续对话时播报，留空即关闭该提示">?</span></label>
                  <input
                    value={(draft.onEnterAI || []).join('、')}
                    onChange={(e) => setF('onEnterAI', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>退出 AI<span className="tip" data-tip="退出连续对话时播报，留空即关闭">?</span></label>
                  <input
                    value={(draft.onExitAI || []).join('、')}
                    onChange={(e) => setF('onExitAI', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>AI 思考中<span className="tip" data-tip="AI 开始回答前的过渡语，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIAsking || []).join('、')}
                    onChange={(e) => setF('onAIAsking', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
                <div className="fld">
                  <label>AI 回答完毕<span className="tip" data-tip="AI 回答结束后的收尾语，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIReplied || []).join('、')}
                    onChange={(e) => setF('onAIReplied', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="fld">
                  <label>AI 出错<span className="tip" data-tip="AI 回答异常时播报，留空即关闭">?</span></label>
                  <input
                    value={(draft.onAIError || []).join('、')}
                    onChange={(e) => setF('onAIError', e.target.value.split(/[、,，]/).filter(Boolean))}
                  />
                </div>
              </div>
            </div>
            <div className="acts">
              <span className="sp" />
              <button className="btn ghost" onClick={cancelEdit}>
                取消
              </button>
              <button className="btn primary" onClick={doSave} disabled={!draft.name}>
                <I n="check" /> 保存
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ══ 设备详情抽屉 ══ */
function Drawer(props: {
  detail: DeviceDetail
  running?: boolean
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  accounts: Account[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onRestart: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const { detail, models } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const m = detail.meta
  const rows: BindingRow[] = detail.bindings?.rows || []
  const rowIcon = (key: BindingRow['key']) => (key === 'account' ? 'user' : key === 'role' ? 'chat' : key === 'think' ? 'bolt' : 'mic')
  const rowType = (key: BindingRow['key']) => (key === 'think' ? ' t' : key === 'voice' ? ' v' : '')
  const srcClass = (s: BindingRow['source']) => (s === 'device' ? ' ovr' : s === 'global' ? ' glb' : '')
  return (
    <>
      <div className={'scrim on' + (closing ? ' closing' : '')} style={{ zIndex: 55 }} onClick={() => close()} />
      <aside className={'drawer on' + (closing ? ' closing' : '')}>
        <div className="dh">
          <span className="cover" style={{ backgroundImage: `url(${coverOf(m.alias, m.did)})` }} />
          <span>
            <b>{m.alias}</b>
            <span>
              {(() => { const r = m.speakerModel; const mm = r ? models.find((x) => x.id === r || x.name === r) : null; return (mm ? mm.name : r || '智能音箱') + ' · ' + m.did })()}
            </span>
          </span>
          <button className="icon-btn x" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="db">
          <div>
            <h4>
              <I n="lock" size={14} /> 绑定链 · 优先级：设备指定 &gt; 角色指定 &gt; 全局默认
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {rows.map((r) => (
                <div className="bind-row" key={r.key}>
                  <span className={'ic' + rowType(r.key)}>
                    <I n={rowIcon(r.key)} size={15} />
                  </span>
                  <span className="lbl">
                    <b>{r.label}</b>
                    <span>{r.detail || ''}</span>
                  </span>
                  <span className="to">→</span>
                  <span className="val">{r.name}</span>
                  <span className={'src' + srcClass(r.source)}>{r.sourceLabel}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4>
              <I n="info" size={14} /> 关键参数
            </h4>
            <div className="kv" style={{ marginTop: 10 }}>
              <div className="kr">
                <span className="k">did</span>
                <span className="vv">{m.did}</span>
              </div>
              <div className="kr">
                <span className="k">型号</span>
                <span className="vv">{(() => { const r = m.speakerModel; const mm = r ? models.find((x) => x.id === r || x.name === r) : null; return mm ? `${mm.name}（${mm.did}）` : r || '—' })()}</span>
              </div>
              <div className="kr">
                <span className="k">所属账号</span>
                <span className="vv">{props.accounts.find((a) => a.id === m.accountId)?.name || '未绑定'}</span>
              </div>
              <div className="kr">
                <span className="k">服务状态</span>
                <span className="vv">{props.running ? '运行中' : '未启动'}</span>
              </div>
              <div className="kr">
                <span className="k">连续对话</span>
                <span className="vv">
                  {(() => {
                    const mm = m.speakerModel ? models.find((x) => x.id === m.speakerModel || x.name === m.speakerModel) : null
                    if (!mm) return '—'
                    if (!mm.consecutive) return '未启用（型号不支持）'
                    return mm.playingCommand?.length ? '启用 · 支持播放状态检测' : '启用 · 依赖 Mina 检测播放状态'
                  })()}
                </span>
              </div>
              <div className="kr">
                <span className="k">对话超时</span>
                <span className="vv">{m.exitKeepAliveAfter ?? 30} 秒无响应退出</span>
              </div>
              <div className="kr">
                <span className="k">会话群</span>
                <span className="vv">{(() => { const rm = m.roomRef ? props.rooms.find((x) => x.id === m.roomRef) : null; return rm ? `${rm.name}${rm.description ? ' · ' + rm.description : ''}` : (m.roomName ? m.roomName : '—') })()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={() => close(props.onEdit)}>
            <I n="pencil" /> 编辑绑定
          </button>
          <button className="btn danger" onClick={() => close(props.onRemove)}>
            <I n="trash" /> 解绑设备
          </button>
          <span className="sp" />
          <button className="btn primary" onClick={() => close(props.onRestart)}>
            <I n="refresh" /> 重启设备
          </button>
        </div>
      </aside>
    </>
  )
}

/* ══ 弹窗外壳 ══ */
function ModalShell(props: {
  modal: ModalState
  accounts: Account[]
  roles: Role[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  models: SpeakerModel[]
  rooms: Room[]
  onClose: () => void
  onDone: (values: Record<string, unknown>) => void
}) {
  const [v, setV] = useState<Record<string, string>>(() => {
    const p = (props.modal.payload || {}) as Record<string, unknown>
    const init: Record<string, string> = {}
    if (props.modal.kind === 'account') {
      init.name = (p.name as string) || ''
      init.miUserId = (p.miUserId as string) || ''
      init.passToken = ''
    } else if (props.modal.kind === 'think') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'doubao'
      init.model = (p.model as string) || PROVIDER_PRESETS[init.provider]?.model || ''
      init.apiKey = ''
      init.temperature = String((p.temperature as number) ?? 0.7)
      init.baseUrl = (p.baseUrl as string) || PROVIDER_PRESETS[init.provider]?.baseUrl || ''
    } else if (props.modal.kind === 'voice') {
      init.name = (p.name as string) || ''
      init.provider = (p.provider as string) || 'edge'
      init.voiceId = (p.voiceId as string) || ''
      const tts = (p.tts as Record<string, any>) || {}
      init.edgeToken = tts.edge?.trustedToken || ''
      init.volcanoAppId = tts.volcano?.appId || ''
      init.volcanoToken = tts.volcano?.accessToken || ''
      init.openaiKey = tts.openai?.apiKey || ''
      init.openaiModel = tts.openai?.model || ''
      init.openaiBaseUrl = tts.openai?.baseUrl || ''
    } else if (props.modal.kind === 'role') {
      init.name = (p.name as string) || ''
      init.profile = (p.profile as string) || ''
    } else if (props.modal.kind === 'deviceBind') {
      init.accountId = (p.accountId as string) || ''
      init.roleId = (p.roleId as string) || ''
      init.thinkServiceId = (p.thinkServiceId as string) || ''
      init.voiceOverrideId = (p.voiceOverrideId as string) || ''
      init.speakerModel = (p.speakerModel as string) || ''
      init.exitKeepAliveAfter = String((p.exitKeepAliveAfter as number) ?? 30)
      init.roomRef = (p.roomRef as string) || ''
    }
    return init
  })
  const { modal } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      else props.onClose()
    }, 200)
  }
  const isEdit = !!(modal.payload as { id?: string })?.id
  const submit = () => {
    if (closing) return
    let out: Record<string, unknown> = {}
    if (modal.kind === 'account') {
      out = { name: v.name, miUserId: v.miUserId, passToken: v.passToken }
    } else if (modal.kind === 'think') {
      out = { name: v.name, provider: v.provider, model: v.model, temperature: parseFloat(v.temperature) || 0.7 }
      out.baseUrl = v.baseUrl || PROVIDER_PRESETS[v.provider]?.baseUrl || ''
      if (v.apiKey) out.apiKey = v.apiKey
    } else if (modal.kind === 'voice') {
      out = { name: v.name, provider: v.provider }
      if (v.voiceId) out.voiceId = v.voiceId
      const tts: Record<string, unknown> = {}
      if (v.provider === 'edge') {
        tts.edge = v.edgeToken ? { trustedToken: v.edgeToken } : {}
      } else if (v.provider === 'volcano') {
        if (!v.volcanoAppId || !v.volcanoToken) {
          setV({ ...v, err: '火山引擎需填写 App ID 与访问令牌' })
          return
        }
        tts.volcano = { appId: v.volcanoAppId, accessToken: v.volcanoToken }
      } else if (v.provider === 'openai') {
        if (!v.openaiKey) {
          setV({ ...v, err: 'OpenAI TTS 需填写 API Key' })
          return
        }
        tts.openai = {
          apiKey: v.openaiKey,
          ...(v.openaiModel ? { model: v.openaiModel } : {}),
          ...(v.openaiBaseUrl ? { baseUrl: v.openaiBaseUrl } : {}),
        }
      } else if (v.provider === 'custom') {
        try {
          const j = JSON.parse(v.customJson || '{}')
          Object.assign(tts, j)
        } catch {
          setV({ ...v, err: '自定义 TTS 配置不是合法 JSON' })
          return
        }
      }
      if (Object.keys(tts).length) out.tts = tts as never
    } else if (modal.kind === 'role') {
      out = { name: v.name, profile: v.profile }
    } else if (modal.kind === 'pwd') {
      if (!v.pwd) {
        setV({ ...v, err: '请输入新密码' })
        return
      }
      if (v.pwd !== v.pwd2) {
        setV({ ...v, err: '两次输入的新密码不一致' })
        return
      }
      out = { old: v.old, pwd: v.pwd }
    } else if (modal.kind === 'deviceBind') {
      out = {
        roleId: v.roleId || undefined,
        accountId: v.accountId || undefined,
        thinkServiceId: v.thinkServiceId || undefined,
        voiceOverrideId: v.voiceOverrideId || undefined,
        speakerModel: v.speakerModel || undefined,
        exitKeepAliveAfter: parseInt(v.exitKeepAliveAfter || '30', 10) || 30,
        roomRef: v.roomRef || undefined,
      }
    }
    close(() => props.onDone(out))
  }
  return (
    <>
      <div className={'scrim on' + (closing ? ' closing' : '')} onClick={() => close()} />
      <div className={'modal on' + (closing ? ' closing' : '')}>
        <h3>
          <I n={modal.kind === 'pwd' ? 'lock' : modal.kind === 'think' ? 'bolt' : modal.kind === 'voice' ? 'mic' : modal.kind === 'role' ? 'chat' : 'user'} size={18} /> {modal.title}
        </h3>
        <div className="desc">{modal.desc}</div>

        {modal.kind === 'account' && (
          <>
            <div className="fld">
              <label>账号名称</label>
              <input value={v.name || ''} placeholder="例如：默认账号" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>小米 ID</label>
              <input value={v.miUserId || ''} placeholder="例如：1234567890" onChange={(e) => setV({ ...v, miUserId: e.target.value })} />
              <span className="hint">登录官方 小米账号 › 个人信息 后获取 小米ID，不是手机号或邮箱。</span>
            </div>
            <div className="fld">
              <label>passToken</label>
              <textarea rows={4} value={v.passToken || ''} placeholder={isEdit && v.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => setV({ ...v, passToken: e.target.value })} />
              <span className="hint">{isEdit ? '留空则保留原凭据' : '异地登录安全验证时，会给出授权链接'}</span>
            </div>
          </>
        )}

        {modal.kind === 'think' && (
          <>
            <div className="fld">
              <label>服务名称</label>
              <input value={v.name || ''} placeholder="例如：豆包 Doubao-Seed" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>供应商</label>
              <select
                value={v.provider || 'doubao'}
                onChange={(e) => {
                  const p = e.target.value
                  const preset = PROVIDER_PRESETS[p]
                  const prev = PROVIDER_PRESETS[v.provider || '']
                  setV({ ...v, provider: p, baseUrl: preset?.baseUrl || '', model: v.model && v.model !== prev?.model ? v.model : preset?.model || '' })
                }}
              >
                {Object.entries(PROVIDERS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>接口地址</label>
              {v.provider === 'custom' ? (
                <input value={v.baseUrl || ''} placeholder="https://api.example.com/v1" onChange={(e) => setV({ ...v, baseUrl: e.target.value })} />
              ) : (
                <input value={v.baseUrl || PROVIDER_PRESETS[v.provider || '']?.baseUrl || ''} readOnly disabled placeholder="选择供应商后自动填充" />
              )}
              <span className="hint">选「自定义」时可手动填写；其他供应商自动填充官方地址</span>
            </div>
            <div className="fld">
              <label>模型端点</label>
              <input value={v.model || ''} placeholder="ep-xxxxxxxx 或模型名" onChange={(e) => setV({ ...v, model: e.target.value })} />
              <span className="hint">切换供应商自动带出示例模型，可修改</span>
            </div>
            <div className="fld">
              <label>API Key</label>
              <input value={v.apiKey || ''} placeholder="ark-••••" onChange={(e) => setV({ ...v, apiKey: e.target.value })} />
              <span className="hint">{isEdit ? '留空则保留原 Key' : '仅服务端保存，面板不展示明文'}</span>
            </div>
            <div className="fld">
              <label>温度</label>
              <input value={v.temperature || '0.7'} onChange={(e) => setV({ ...v, temperature: e.target.value })} />
            </div>
          </>
        )}

        {modal.kind === 'voice' && (
          <>
            <div className="fld">
              <label>服务名称</label>
              <input value={v.name || ''} placeholder="例如：豆包语音" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>供应商</label>
              <select value={v.provider || 'edge'} onChange={(e) => setV({ ...v, provider: e.target.value })}>
                {Object.entries(TTS_ENGINES)
                  .filter(([k]) => k !== 'builtin')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="fld">
              <label>音色</label>
              <input value={v.voiceId || ''} placeholder="选择或输入音色 ID" onChange={(e) => setV({ ...v, voiceId: e.target.value })} />
              <span className="hint">留空使用该引擎的默认音色</span>
            </div>
            {v.provider === 'edge' && (
              <div className="fld">
                <label>访问令牌（可选）</label>
                <input value={v.edgeToken || ''} placeholder="留空由 Edge 自动获取" onChange={(e) => setV({ ...v, edgeToken: e.target.value })} />
              </div>
            )}
            {v.provider === 'volcano' && (
              <>
                <div className="fld">
                  <label>App ID</label>
                  <input value={v.volcanoAppId || ''} placeholder="火山引擎语音合成 App ID" onChange={(e) => setV({ ...v, volcanoAppId: e.target.value })} />
                </div>
                <div className="fld">
                  <label>访问令牌</label>
                  <input value={v.volcanoToken || ''} placeholder="火山引擎 Access Token" onChange={(e) => setV({ ...v, volcanoToken: e.target.value })} />
                </div>
              </>
            )}
            {v.provider === 'openai' && (
              <>
                <div className="fld">
                  <label>API Key</label>
                  <input value={v.openaiKey || ''} placeholder="OpenAI API Key" onChange={(e) => setV({ ...v, openaiKey: e.target.value })} />
                </div>
                <div className="fld">
                  <label>模型（可选）</label>
                  <input value={v.openaiModel || ''} placeholder="tts-1" onChange={(e) => setV({ ...v, openaiModel: e.target.value })} />
                </div>
                <div className="fld">
                  <label>接口地址（可选）</label>
                  <input value={v.openaiBaseUrl || ''} placeholder="https://api.openai.com/v1" onChange={(e) => setV({ ...v, openaiBaseUrl: e.target.value })} />
                </div>
              </>
            )}
            {v.provider === 'custom' && (
              <div className="fld">
                <label>TTS 配置（JSON）</label>
                <textarea rows={4} value={v.customJson || ''} placeholder='{"edge":{"trustedToken":"…"}}' onChange={(e) => setV({ ...v, customJson: e.target.value })} />
                <span className="hint">高级用法：直接填写 mi-gpt TTSConfig JSON</span>
              </div>
            )}
          </>
        )}

        {modal.kind === 'role' && (
          <>
            <div className="fld">
              <label>角色名称</label>
              <input value={v.name || ''} placeholder="例如：深夜电台 DJ" onChange={(e) => setV({ ...v, name: e.target.value })} />
            </div>
            <div className="fld">
              <label>人设描述</label>
              <textarea
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-m)', padding: '8px 12px', font: 'inherit', minHeight: 76 }}
                value={v.profile || ''}
                placeholder="你是谁、怎么说话、回答风格"
                onChange={(e) => setV({ ...v, profile: e.target.value })}
              />
            </div>
          </>
        )}

        {modal.kind === 'pwd' && (
          <>
            <div className="fld">
              <label>当前密码</label>
              <input type="password" value={v.old || ''} onChange={(e) => setV({ ...v, old: e.target.value })} />
            </div>
            <div className="fld">
              <label>新密码</label>
              <input type="password" value={v.pwd || ''} onChange={(e) => setV({ ...v, pwd: e.target.value })} />
            </div>
            <div className="fld">
              <label>确认新密码</label>
              <input type="password" value={v.pwd2 || ''} onChange={(e) => setV({ ...v, pwd2: e.target.value, err: '' })} />
            </div>
            {v.err && (
              <div className="notice err">
                <I n="warning" size={15} /> {v.err}
              </div>
            )}
          </>
        )}

        {modal.kind === 'deviceBind' && (
          <>
            {modal.title === '变更生效说明' ? (
              <div className="notice">
                <I n="warning" size={15} /> 换绑账号、修改唤醒词或 did 必须重启设备；角色内容、思考服务（模型 / 温度）热生效；语音服务支持热切。
              </div>
            ) : (
              <>
                <div className="fld">
                  <label>所属账号</label>
                  <select value={v.accountId || ''} onChange={(e) => setV({ ...v, accountId: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.miUserId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>对话角色</label>
                  <select value={v.roleId || ''} onChange={(e) => setV({ ...v, roleId: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>思考服务</label>
                  <select value={v.thinkServiceId || ''} onChange={(e) => setV({ ...v, thinkServiceId: e.target.value })}>
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.thinkSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>语音服务（设备覆盖）</label>
                  <select value={v.voiceOverrideId || ''} onChange={(e) => setV({ ...v, voiceOverrideId: e.target.value })}>
                    <option value="">（继承角色 / 全局默认）</option>
                    {props.voiceSvcs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.isDefault ? ' · 默认' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>设备型号</label>
                  <select value={v.speakerModel || ''} onChange={(e) => setV({ ...v, speakerModel: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.models.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.builtin ? '' : ' · 自定义'}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const mm = v.speakerModel ? props.models.find((x) => x.id === v.speakerModel) : null
                    if (!mm) return <span className="hint">切换型号后，播放指令 / 唤醒指令等硬件参数随型号生效</span>
                    if (!mm.consecutive) {
                      return <span className="hint warn">型号不支持连续对话（streamResponse 已禁用）</span>
                    }
                    return mm.playingCommand?.length ? (
                      <span className="hint">支持连续对话 · 支持播放状态检测</span>
                    ) : (
                      <span className="hint">支持连续对话 · 未配置播放检测指令，将依赖 Mina 检测播放状态；若异常可在「设备型号」中补充该指令</span>
                    )
                  })()}
                </div>
                <div className="fld">
                  <label>连续对话超时（秒）</label>
                  <input value={v.exitKeepAliveAfter || '30'} placeholder="默认 30" onChange={(e) => setV({ ...v, exitKeepAliveAfter: e.target.value })} />
                  <span className="hint">连续对话中无响应多久自动退出唤醒模式，默认 30 秒</span>
                </div>
                <div className="fld">
                  <label>会话群</label>
                  <select value={v.roomRef || ''} onChange={(e) => setV({ ...v, roomRef: e.target.value })}>
                    <option value="">（保持当前）</option>
                    {props.rooms.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name}
                      </option>
                    ))}
                  </select>
                  <span className="hint">对话记忆的上下文归属（对应旧版「会话群 chatGroup」），多台设备可共用；可在「会话群」菜单新建</span>
                </div>
                <div className="notice">
                  <I n="warning" size={15} /> 修改后需重启设备生效。
                </div>
              </>
            )}
          </>
        )}

        <div className="acts">
          <button className="btn" onClick={() => close()}>
            取消
          </button>
          <button className="btn primary" onClick={submit}>
            {modal.kind === 'deviceBind' && modal.title === '变更生效说明' ? '知道了' : '确定'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ══ 三步向导 ══ */
function Wizard(props: {
  step: number
  accounts: Account[]
  roles: Role[]
  models: SpeakerModel[]
  thinkSvcs: ThinkService[]
  voiceSvcs: VoiceService[]
  devices: { id: string; alias: string; did: string; accountId?: string }[]
  draft: { step: number; accountId: string; alias: string; did: string; model: string; roleId: string }
  setDraft: (p: Partial<{ step: number; accountId: string; alias: string; did: string; model: string; roleId: string }>) => void
  onClose: () => void
  onFinish: () => void
  onNewAccount: (d: { name: string; miUserId: string; passToken: string }) => Promise<Account>
  onUpdateAccount: (id: string, d: Partial<Account>) => Promise<Account>
  onNewRole: (d: { name: string; profile?: string }) => Promise<Role>
  onUpdateRole: (id: string, d: Partial<Role>) => Promise<Role>
}) {
  const { draft } = props
  const [closing, setClosing] = useState(false)
  const close = (after?: () => void) => {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      if (after) after()
      props.onClose()
    }, 200)
  }
  const [pulling, setPulling] = useState(false)
  const [pullErr, setPullErr] = useState('')
  const [pulled, setPulled] = useState<PulledDevice[] | null>(null)
  const [newAcct, setNewAcct] = useState(false)
  const [acctEdit, setAcctEdit] = useState(false)
  const [naDraft, setNaDraft] = useState({ name: '', miUserId: '', passToken: '' })
  const [naBusy, setNaBusy] = useState(false)
  const [naErr, setNaErr] = useState('')
  const [newRole, setNewRole] = useState(false)
  const [roleEdit, setRoleEdit] = useState(false)
  const [nrDraft, setNrDraft] = useState<{ name: string; profile: string; thinkServiceId?: string; voiceId?: string }>({ name: '', profile: '' })
  const [nrBusy, setNrBusy] = useState(false)
  const [nrErr, setNrErr] = useState('')
  const step = draft.step
  const selAcct = props.accounts.find((a) => a.id === draft.accountId)
  const selRole = props.roles.find((r) => r.id === draft.roleId)
  const load = useCallback((accountId: string) => {
    if (!accountId) return
    setPulling(true)
    setPullErr('')
    setPulled(null)
    api
      .pullDevices(accountId)
      .then((r) => {
        const list = r.devices || []
        setPulled(list)
        if (!list.length) setPullErr('该账号下未发现音箱设备，请确认小米 ID 与 passToken 正确')
      })
      .catch((e) => setPullErr((e as Error).message || '拉取设备失败'))
      .finally(() => setPulling(false))
  }, [])
  useEffect(() => {
    if (step === 1 && draft.accountId) load(draft.accountId)
  }, [step, draft.accountId, load])
  // 列表有实体时默认选中第一个；无实体时右侧展示新建表单
  useEffect(() => {
    if (step === 0 && !draft.accountId && props.accounts.length) props.setDraft({ accountId: props.accounts[0].id })
  }, [step, draft.accountId, props.accounts, props.setDraft])
  useEffect(() => {
    if (step === 2 && !draft.roleId && props.roles.length) props.setDraft({ roleId: props.roles[0].id })
  }, [step, draft.roleId, props.roles, props.setDraft])
  // 设备拉取完成且有设备时，默认选中第一台
  useEffect(() => {
    if (step === 1 && pulled && pulled.length > 0 && !draft.did) {
      const d = pulled[0]
      const m = modelOf(d.hardware)
      props.setDraft({ alias: d.name || d.alias, did: d.miotDID, model: m ? m.id : draft.model })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pulled, draft.did])
  const saveAcct = async () => {
    if (naBusy) return
    setNaBusy(true)
    setNaErr('')
    try {
      if (acctEdit && selAcct) {
        await props.onUpdateAccount(selAcct.id, { name: naDraft.name, miUserId: naDraft.miUserId, ...(naDraft.passToken ? { passToken: naDraft.passToken } : {}) })
        setAcctEdit(false)
      } else {
        const created = await props.onNewAccount(naDraft)
        props.setDraft({ accountId: created.id })
        setNewAcct(false)
      }
      setNaDraft({ name: '', miUserId: '', passToken: '' })
    } catch (e) {
      setNaErr((e as Error).message || '保存账号失败')
    } finally {
      setNaBusy(false)
    }
  }
  const saveRole = async () => {
    if (nrBusy) return
    setNrBusy(true)
    setNrErr('')
    try {
      const body: Record<string, unknown> = { name: nrDraft.name, profile: nrDraft.profile }
      if (nrDraft.thinkServiceId) body.thinkServiceId = nrDraft.thinkServiceId
      if (nrDraft.voiceId) body.voiceId = nrDraft.voiceId
      if (roleEdit && selRole) {
        await props.onUpdateRole(selRole.id, body)
        setRoleEdit(false)
      } else {
        const created = await props.onNewRole(body)
        props.setDraft({ roleId: created.id })
        setNewRole(false)
      }
      setNrDraft({ name: '', profile: '' })
    } catch (e) {
      setNrErr((e as Error).message || '保存角色失败')
    } finally {
      setNrBusy(false)
    }
  }
  const beginAcctEdit = () => {
    if (!selAcct) return
    setNewAcct(false)
    setAcctEdit(true)
    setNaDraft({ name: selAcct.name, miUserId: selAcct.miUserId, passToken: '' })
  }
  const beginRoleEdit = () => {
    if (!selRole) return
    setNewRole(false)
    setRoleEdit(true)
    setNrDraft({ name: selRole.name, profile: selRole.profile || '', thinkServiceId: selRole.thinkServiceId, voiceId: selRole.voiceId })
  }
  const canNext =
    (step === 0 && !!draft.accountId) ||
    (step === 1 && !!draft.did && !pullErr) ||
    step === 2
  const finish = () => {
    if (closing) return
    if (step === 2) close(props.onFinish)
    else if (canNext) props.setDraft({ step: step + 1 })
  }
  const modelOf = (hardware: string) =>
    props.models.find((x) => {
      const a = (x.did || '').toLowerCase()
      const b = (hardware || '').toLowerCase()
      return a === b || a.startsWith(b) || b.startsWith(a)
    })
  const WSTEP = [
    { n: '1', t: '连接账号', s: '读取设备' },
    { n: '2', t: '选择设备', s: '确认型号' },
    { n: '3', t: '对话服务', s: '保存并启动' },
  ]
  return (
    <div className={'wizard on' + (closing ? ' closing' : '')}>
      <div className="wiz">
        <div className="wh">
          <div className="wtitle">
            <b>设备连接向导</b>
          </div>
          <div className="wsteps">
            {WSTEP.map((it, i) => (
              <div key={i} className={'wstep' + (step === i ? ' on' : i < step ? ' done' : '')}>
                <span className="wno">{i < step ? <I n="check" size={13} /> : it.n}</span>
                <span className="wt">
                  <b>{it.t}（{it.s}）</b>
                </span>
              </div>
            ))}
          </div>
          <button className="icon-btn" onClick={() => close()}>
            <I n="x" />
          </button>
        </div>
        <div className="wb">
          <div className={'step' + (step === 0 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.accounts.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有云端账号</b>
                    <span>请新建一个账号，或在「账号设备」页先接入。</span>
                  </div>
                )}
                {props.accounts.map((a) => (
                  <div key={a.id} className={'li' + (draft.accountId === a.id ? ' on' : '')} onClick={() => { props.setDraft({ accountId: a.id }); setNewAcct(false); setAcctEdit(false); setNaDraft({ name: '', miUserId: '', passToken: '' }) }}>
                    <span className="ic">
                      <I n="user" />
                    </span>
                    <span className="txt">
                      <b>{a.name}</b>
                      <span>小米 ID {a.miUserId}</span>
                    </span>
                  </div>
                ))}
                <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => { setNewAcct(true); setAcctEdit(false); setNaDraft({ name: '', miUserId: '', passToken: '' }) }}>
                  <I n="plus" /> 新建
                </button>
              </aside>
              <section className="sdetail">
                {selAcct && !newAcct && !acctEdit ? (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> 账号详情
                    </h3>
                    <div className="desc">账号信息与凭据状态；凭据仅保存于本机服务端。</div>
                    <div className="ro">
                      <div className="rr">
                        <span className="k">账号名称</span>
                        <span className="v">{selAcct.name || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">小米 ID</span>
                        <span className="v">{selAcct.miUserId || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">passToken</span>
                        <span className="v">{selAcct.passToken ? '已保存' : '未配置'}</span>
                      </div>
                    </div>
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn primary" onClick={beginAcctEdit}>
                        <I n="pencil" /> 编辑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> {acctEdit && selAcct ? '编辑账号' : '新建云端账号'}
                    </h3>
                    <div className="desc">{acctEdit && selAcct ? '更新名称或凭据；换绑账号后需重启受影响设备。' : '填入小米 ID 与 passToken。凭据仅保存于本机服务端。'}</div>
                    <div className="fld">
                      <label>账号名称</label>
                      <input value={naDraft.name} placeholder="例如：默认账号" onChange={(e) => setNaDraft({ ...naDraft, name: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>小米 ID</label>
                      <input value={naDraft.miUserId} placeholder="登录官方 小米账号 › 个人信息 获取，不是手机号或邮箱" onChange={(e) => setNaDraft({ ...naDraft, miUserId: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>云端会话凭证 passToken</label>
                      <textarea rows={3} value={naDraft.passToken} placeholder={acctEdit && selAcct && selAcct.passToken ? '已保存 · 留空保持不变' : '从米家 / 小爱获取的 token'} onChange={(e) => setNaDraft({ ...naDraft, passToken: e.target.value })} />
                      <span className="hint">{acctEdit && selAcct ? '留空则保留原凭据' : '请勿把凭证发送给其他人；异地登录安全验证时，会给出授权链接。'}</span>
                    </div>
                    {naErr && (
                      <div className="notice err">
                        <I n="warning" size={15} /> {naErr}
                      </div>
                    )}
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn ghost" onClick={() => (acctEdit && selAcct ? (setAcctEdit(false), setNaDraft({ name: '', miUserId: '', passToken: '' })) : setNewAcct(false))}>
                        取消
                      </button>
                      <button className="btn primary" disabled={naBusy || !naDraft.name || !naDraft.miUserId} onClick={saveAcct}>
                        {naBusy ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 1 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {!selAcct ? (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>请先选择云端账号</b>
                    <span>回到上一步选择或新建账号。</span>
                  </div>
                ) : (
                  <>
                    <div className="filters" style={{ margin: '0 0 8px' }}>
                      <span className="chip on">{selAcct.name}</span>
                    </div>
                    {pulling && <div className="hint">正在从小米云端拉取设备…</div>}
                    {pullErr && (
                      <div className="empty" style={{ padding: '16px' }}>
                        <b>未获取到设备信息</b>
                      </div>
                    )}
                    {pulled && pulled.length > 0 ? (
                      pulled.map((d) => {
                        const m = modelOf(d.hardware)
                        const bound = !!props.devices.find((x) => x.accountId === selAcct.id && x.did === d.miotDID)
                        return (
                          <div
                            key={d.miotDID}
                            className={'li' + (draft.did === d.miotDID ? ' on' : '') + (bound ? ' off' : '')}
                            onClick={() => {
                              if (bound) return
                              props.setDraft({ alias: d.name || d.alias, did: d.miotDID, model: m ? m.id : draft.model })
                            }}
                          >
                            <span className="ic">
                              {m?.imageUrl ? <img className="thumb" src={m.imageUrl} alt="" /> : <I n="speaker" />}
                            </span>
                            <span className="txt">
                              <b>{d.name || d.alias}</b>
                              <span>{m ? m.name : d.hardware || '未知型号'}</span>
                            </span>
                            {bound ? <span className="tag neu">已接入</span> : <span className={'tag' + (d.presence === 'online' ? ' accent' : ' neu')}>{d.presence === 'online' ? '在线' : '离线'}</span>}
                          </div>
                        )
                      })
                    ) : (
                      pulled !== null && !pulling && (
                        <div className="empty" style={{ padding: '16px' }}>
                          <b>未发现音箱设备</b>
                          <span>请确认小米 ID 与 passToken 正确。</span>
                        </div>
                      )
                    )}
                  </>
                )}
              </aside>
              <section className="sdetail">
                {pullErr ? (
                  <div className="form-card err-card">
                    <h3>
                      <I n="warning" size={17} /> 设备拉取失败
                    </h3>
                    <div className="notice err">{pullErr}</div>
                    <div className="desc">返回上一步检查小米 ID 与 passToken，或到「账号设备」页更新凭据后重试。</div>
                  </div>
                ) : draft.did ? (
                  <div className="form-card">
                    <h3>
                      <I n="speaker" size={17} /> 设备详情
                    </h3>
                    <div className="desc">设备 ID 与型号由云端自动识别。</div>
                    <div className="ro">
                      {(() => {
                        const hw = (pulled || []).find((x) => x.miotDID === draft.did)?.hardware
                        const m = modelOf(hw)
                        return m?.imageUrl ? (
                          <div className="model-pic">
                            <img className="fade" src={m.imageUrl} alt={m.name} onLoad={(e) => e.currentTarget.classList.add('loaded')} onError={(e) => e.currentTarget.classList.add('loaded')} />
                            <span className="pic-tag">{m.builtin ? '内置型号' : '自定义型号'}</span>
                          </div>
                        ) : null
                      })()}
                      <div className="rr2">
                        <div className="rr">
                          <span className="k">设备名称</span>
                          <span className="v">{draft.alias || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备 ID</span>
                          <span className="v">{draft.did || '—'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备型号</span>
                          <span className="v">{modelOf((pulled || []).find((x) => x.miotDID === draft.did)?.hardware || '')?.name || '待型号映射核对'}</span>
                        </div>
                        <div className="rr">
                          <span className="k">设备状态</span>
                          <span className="v">{(pulled || []).find((x) => x.miotDID === draft.did)?.presence === 'online' ? '在线' : '离线'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty">
                    <div className="art">
                      <I n="speaker" size={26} />
                    </div>
                    <b>选择要接入的设备</b>
                    <span>从左侧列表选择一台音箱；设备 ID 与型号自动识别。</span>
                  </div>
                )}
              </section>
            </div>
          </div>
          <div className={'step' + (step === 2 ? ' on' : '')}>
            <div className="split wsplit">
              <aside className="slist">
                {props.roles.length === 0 && (
                  <div className="empty" style={{ padding: '16px' }}>
                    <b>还没有对话角色</b>
                    <span>请新建一个角色，或到「对话角色」页先创建。</span>
                  </div>
                )}
                {props.roles.map((r) => (
                  <div key={r.id} className={'li' + (draft.roleId === r.id ? ' on' : '')} onClick={() => { props.setDraft({ roleId: r.id }); setNewRole(false); setRoleEdit(false); setNrDraft({ name: '', profile: '' }) }}>
                    <img className="pavatar" src={avatarOf(r.name)} alt={r.name} />
                    <span className="txt">
                      <b>{r.name}</b>
                      <span>{r.profile?.slice(0, 24) || '未填写人设'}</span>
                    </span>
                  </div>
                ))}
                <button className="btn" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => { setNewRole(true); setRoleEdit(false); setNrDraft({ name: '', profile: '' }) }}>
                  <I n="plus" /> 新建
                </button>
              </aside>
              <section className="sdetail">
                {selRole && !newRole && !roleEdit ? (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> 角色详情
                    </h3>
                    <div className="desc">思考服务与语音服务由角色统一提供；人设与模型热生效。</div>
                    <div className="ro">
                      <div className="rr">
                        <span className="k">角色名称</span>
                        <span className="v">{selRole.name || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">人设描述</span>
                        <span className="v" style={{ whiteSpace: 'pre-wrap' }}>{selRole.profile || '—'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">思考服务</span>
                        <span className="v">{props.thinkSvcs.find((s) => s.id === selRole.thinkServiceId)?.name || '跟随全局默认'}</span>
                      </div>
                      <div className="rr">
                        <span className="k">语音服务</span>
                        <span className="v">{props.voiceSvcs.find((s) => s.id === selRole.voiceId)?.name || '跟随全局默认'}</span>
                      </div>
                    </div>
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn primary" onClick={beginRoleEdit}>
                        <I n="pencil" /> 编辑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="form-card">
                    <h3>
                      <I n="user" size={17} /> {roleEdit && selRole ? '编辑角色' : '新建对话角色'}
                    </h3>
                    <div className="desc">{roleEdit && selRole ? '更新角色信息；服务留空则跟随全局默认。' : '角色名称必填；思考服务与语音服务可选，留空则跟随全局默认。'}</div>
                    <div className="fld">
                      <label>角色名称</label>
                      <input value={nrDraft.name} placeholder="例如：小爱同学" onChange={(e) => setNrDraft({ ...nrDraft, name: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>人设描述</label>
                      <textarea rows={4} value={nrDraft.profile} placeholder="例如：你叫小爱，是这家人的智能助手…" onChange={(e) => setNrDraft({ ...nrDraft, profile: e.target.value })} />
                    </div>
                    <div className="fld">
                      <label>思考服务</label>
                      <select value={nrDraft.thinkServiceId || ''} onChange={(e) => setNrDraft({ ...nrDraft, thinkServiceId: e.target.value || undefined })}>
                        <option value="">跟随全局默认</option>
                        {props.thinkSvcs.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <label>语音服务</label>
                      <select value={nrDraft.voiceId || ''} onChange={(e) => setNrDraft({ ...nrDraft, voiceId: e.target.value || undefined })}>
                        <option value="">跟随全局默认</option>
                        {props.voiceSvcs.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {nrErr && (
                      <div className="notice err">
                        <I n="warning" size={15} /> {nrErr}
                      </div>
                    )}
                    <div className="acts">
                      <span className="sp" />
                      <button className="btn ghost" onClick={() => (roleEdit && selRole ? (setRoleEdit(false), setNrDraft({ name: '', profile: '' })) : setNewRole(false))}>
                        取消
                      </button>
                      <button className="btn primary" disabled={nrBusy || !nrDraft.name} onClick={saveRole}>
                        {nrBusy ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
        <div className="wf">
          <button className="btn ghost" disabled={step === 0} onClick={() => props.setDraft({ step: step - 1 })}>
            <I n="arrowL" /> 上一步
          </button>
          <div className="r">
            <button className="btn" onClick={() => close()}>
              取消
            </button>
            <button className="btn primary" disabled={!canNext && step < 2} onClick={finish}>
              {step === 2 ? '完成' : '下一步'} <I n="arrowR" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
