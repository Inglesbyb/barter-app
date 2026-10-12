-- ==============================================================================
-- SwitchR — Generate 20 Offers from 20 Different Bots for Liverpool Switch Listing
-- Target Item: 953dacd0-93db-48a9-9225-85e4871f8e3f ("Switch 1 with pads n that")
-- Receiver: 651cc925-10e0-4da6-84d2-b09a961b1362 (bentest)
-- ==============================================================================

-- 1. Update user bentest location to Liverpool
UPDATE public.profiles
SET location_name = 'Liverpool, UK', lat = 53.4084, lng = -2.9916
WHERE id = '651cc925-10e0-4da6-84d2-b09a961b1362';

-- 2. Update bot profiles to realistic Liverpool, Merseyside & surrounding locations
UPDATE public.profiles SET location_name = 'Baltic Triangle, Liverpool', lat = 53.3970, lng = -2.9800 WHERE id = 'dd91006c-34d7-4e54-85c6-bc2c3c784b21'; -- balgownie_20
UPDATE public.profiles SET location_name = 'Lark Lane, Liverpool', lat = 53.3820, lng = -2.9360 WHERE id = 'e7056c94-54f8-4478-8f72-240ae559ce33'; -- jesmond_19
UPDATE public.profiles SET location_name = 'Crosby, Liverpool', lat = 53.4860, lng = -3.0330 WHERE id = 'c7fe8107-e108-4788-bd22-8de3676e53b4'; -- leith_18
UPDATE public.profiles SET location_name = 'Allerton, Liverpool', lat = 53.3760, lng = -2.8980 WHERE id = '8f9a8003-3fcc-429a-9f51-4d58520770c1'; -- allerton_14
UPDATE public.profiles SET location_name = 'Birkenhead, Merseyside', lat = 53.3930, lng = -3.0140 WHERE id = 'b8a70fdf-8e9d-49c5-a933-e2365a8a680f'; -- stockbridge_17
UPDATE public.profiles SET location_name = 'Woolton, Liverpool', lat = 53.3730, lng = -2.8680 WHERE id = '6df32d06-8d7e-4d70-89a8-968bef274632'; -- kelvinbridge_16
UPDATE public.profiles SET location_name = 'St Helens, Merseyside', lat = 53.4530, lng = -2.7370 WHERE id = 'c937a643-a76f-4551-9178-71c1aea2d555'; -- didsbury_12
UPDATE public.profiles SET location_name = 'Manchester, UK', lat = 53.4808, lng = -2.2426 WHERE id = 'a8b09a95-213f-4d68-9957-e7eba10c2e91'; -- manchester_northern_quar
UPDATE public.profiles SET location_name = 'Chester, Cheshire', lat = 53.1930, lng = -2.8930 WHERE id = '54c334aa-41bd-4f1f-ab79-3c503c9acfec'; -- stratford_10
UPDATE public.profiles SET location_name = 'Southport, Merseyside', lat = 53.6470, lng = -3.0060 WHERE id = '45a57156-4ab1-4481-9e80-c275650a05b4'; -- kensington_9
UPDATE public.profiles SET location_name = 'Warrington, Cheshire', lat = 53.3900, lng = -2.5970 WHERE id = '8db7879f-d218-4b3f-8e59-bbe414758a97'; -- clapham_8
UPDATE public.profiles SET location_name = 'Heswall, Wirral', lat = 53.3280, lng = -3.0970 WHERE id = '76d27584-958b-4be9-93ba-89d1d4db9a09'; -- richmond_7
UPDATE public.profiles SET location_name = 'Aigburth, Liverpool', lat = 53.3710, lng = -2.9320 WHERE id = 'a51d9371-37f0-49a1-9f7e-bd6e09a81c8b'; -- islington_6
UPDATE public.profiles SET location_name = 'Bootle, Liverpool', lat = 53.4450, lng = -2.9920 WHERE id = '6e43e8a0-1142-4273-b734-395d6cb86ee4'; -- greenwich_5
UPDATE public.profiles SET location_name = 'Ormskirk, Lancashire', lat = 53.5680, lng = -2.8870 WHERE id = '0377e377-841f-4385-9691-7d27c16268bd'; -- shoreditch_4
UPDATE public.profiles SET location_name = 'Anfield, Liverpool', lat = 53.4300, lng = -2.9600 WHERE id = '98e7c80d-f1b8-48a0-97c5-f8b585007a9d'; -- brixton_3
UPDATE public.profiles SET location_name = 'Kirkby, Merseyside', lat = 53.4830, lng = -2.8920 WHERE id = '71a49e0e-f8b4-4c35-a7fd-89ed90bdd7a1'; -- camden_town_2
UPDATE public.profiles SET location_name = 'Wavertree, Liverpool', lat = 53.3990, lng = -2.9230 WHERE id = '5926d098-213a-4381-be59-f8eab48a75a6'; -- hackney_1
UPDATE public.profiles SET location_name = 'Runcorn, Cheshire', lat = 53.3420, lng = -2.7320 WHERE id = '4f1f65d5-368e-40c7-982a-5a82df5872ef'; -- elena_style
UPDATE public.profiles SET location_name = 'Widnes, Cheshire', lat = 53.3630, lng = -2.7280 WHERE id = '055d8694-2153-47f1-a425-d2f276281c3a'; -- marcus_audio

-- 3. Delete any previous pending trades for this item to ensure a clean slate
DELETE FROM public.trades WHERE requested_item_id = '953dacd0-93db-48a9-9225-85e4871f8e3f';

-- 4. Insert 20 trade offers from 20 distinct bot profiles for bentest's Switch listing
INSERT INTO public.trades (initiator_id, receiver_id, offered_item_id, requested_item_id, status, created_at, updated_at)
VALUES
('dd91006c-34d7-4e54-85c6-bc2c3c784b21', '651cc925-10e0-4da6-84d2-b09a961b1362', 'b456e48b-801f-4478-8705-e99ec66b8e59', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '20 minutes', now() - interval '20 minutes'),
('e7056c94-54f8-4478-8f72-240ae559ce33', '651cc925-10e0-4da6-84d2-b09a961b1362', 'df7aba8b-4b1d-4b06-851f-44f87ada51c5', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '19 minutes', now() - interval '19 minutes'),
('c7fe8107-e108-4788-bd22-8de3676e53b4', '651cc925-10e0-4da6-84d2-b09a961b1362', 'b1b09f41-b18c-4a53-b071-b1a814f50bdf', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '18 minutes', now() - interval '18 minutes'),
('b8a70fdf-8e9d-49c5-a933-e2365a8a680f', '651cc925-10e0-4da6-84d2-b09a961b1362', 'dc7cd29f-fc85-4f44-a57d-86272004cccd', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '17 minutes', now() - interval '17 minutes'),
('6df32d06-8d7e-4d70-89a8-968bef274632', '651cc925-10e0-4da6-84d2-b09a961b1362', 'e7dffe5a-1043-4a82-b8d0-4c697057ed0d', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '16 minutes', now() - interval '16 minutes'),
('8f9a8003-3fcc-429a-9f51-4d58520770c1', '651cc925-10e0-4da6-84d2-b09a961b1362', 'ce984668-8fa8-40ed-a866-1f35e0e97743', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '15 minutes', now() - interval '15 minutes'),
('c937a643-a76f-4551-9178-71c1aea2d555', '651cc925-10e0-4da6-84d2-b09a961b1362', 'd47e9c43-2c01-4948-9f6c-78424209c844', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '14 minutes', now() - interval '14 minutes'),
('a8b09a95-213f-4d68-9957-e7eba10c2e91', '651cc925-10e0-4da6-84d2-b09a961b1362', 'd256c54f-e3b4-4802-8129-6adeb641ff83', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '13 minutes', now() - interval '13 minutes'),
('54c334aa-41bd-4f1f-ab79-3c503c9acfec', '651cc925-10e0-4da6-84d2-b09a961b1362', 'fa5a2b46-4763-4a52-9266-9b85ff99bb15', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '12 minutes', now() - interval '12 minutes'),
('45a57156-4ab1-4481-9e80-c275650a05b4', '651cc925-10e0-4da6-84d2-b09a961b1362', 'eda0327e-c4d9-4e95-9719-aa1767067e7b', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '11 minutes', now() - interval '11 minutes'),
('8db7879f-d218-4b3f-8e59-bbe414758a97', '651cc925-10e0-4da6-84d2-b09a961b1362', 'c463ffcc-173f-455b-bc82-8adb4ff36ec2', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '10 minutes', now() - interval '10 minutes'),
('76d27584-958b-4be9-93ba-89d1d4db9a09', '651cc925-10e0-4da6-84d2-b09a961b1362', 'ecac0e51-5901-4f1b-95b1-bd03f2571f40', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '9 minutes', now() - interval '9 minutes'),
('a51d9371-37f0-49a1-9f7e-bd6e09a81c8b', '651cc925-10e0-4da6-84d2-b09a961b1362', 'a5ff7215-2c35-4c34-aee9-7abab89df173', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '8 minutes', now() - interval '8 minutes'),
('6e43e8a0-1142-4273-b734-395d6cb86ee4', '651cc925-10e0-4da6-84d2-b09a961b1362', 'dff947a4-b611-415b-a445-7535042c5514', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '7 minutes', now() - interval '7 minutes'),
('0377e377-841f-4385-9691-7d27c16268bd', '651cc925-10e0-4da6-84d2-b09a961b1362', 'e5be9a66-ce52-4f9b-b3d3-7aef93fafb57', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '6 minutes', now() - interval '6 minutes'),
('98e7c80d-f1b8-48a0-97c5-f8b585007a9d', '651cc925-10e0-4da6-84d2-b09a961b1362', 'a60971ba-fd1e-47e5-8fe8-3f85b4a2fc83', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '5 minutes', now() - interval '5 minutes'),
('71a49e0e-f8b4-4c35-a7fd-89ed90bdd7a1', '651cc925-10e0-4da6-84d2-b09a961b1362', 'ba7bdebc-92b4-4dba-ab9c-b64329de8f5f', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '4 minutes', now() - interval '4 minutes'),
('5926d098-213a-4381-be59-f8eab48a75a6', '651cc925-10e0-4da6-84d2-b09a961b1362', 'fc2bdeeb-e24f-406f-b1af-9384bf73c0a4', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '3 minutes', now() - interval '3 minutes'),
('4f1f65d5-368e-40c7-982a-5a82df5872ef', '651cc925-10e0-4da6-84d2-b09a961b1362', 'c7c5aac4-9416-4e01-b869-776a39c3a960', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '2 minutes', now() - interval '2 minutes'),
('055d8694-2153-47f1-a425-d2f276281c3a', '651cc925-10e0-4da6-84d2-b09a961b1362', 'f34f8f5a-d797-483b-b3a1-c0841cb931ad', '953dacd0-93db-48a9-9225-85e4871f8e3f', 'pending', now() - interval '1 minute', now() - interval '1 minute');
