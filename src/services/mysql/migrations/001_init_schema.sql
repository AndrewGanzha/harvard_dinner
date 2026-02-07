-- Harvard Plate core schema for MySQL
-- Safe for repeated execution.

create table if not exists schema_migrations (
  version varchar(255) primary key,
  applied_at datetime not null default current_timestamp
);

create table if not exists users (
  telegram_id bigint primary key,
  username varchar(255) null,
  email varchar(255) null unique,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
);

create table if not exists user_ingredients (
  id char(36) primary key,
  telegram_id bigint not null,
  name varchar(255) not null,
  category enum('vegetable', 'grain', 'protein', 'fat') not null,
  created_at datetime not null default current_timestamp,
  unique key uniq_user_ingredient (telegram_id, name),
  constraint fk_user_ingredients_user
    foreign key (telegram_id) references users(telegram_id)
    on delete cascade
);

create table if not exists saved_plates (
  id char(36) primary key,
  telegram_id bigint not null,
  name varchar(255) null,
  ingredients json not null,
  recipe_data json null,
  created_at datetime not null default current_timestamp,
  key idx_saved_plates_user (telegram_id),
  constraint fk_saved_plates_user
    foreign key (telegram_id) references users(telegram_id)
    on delete cascade
);

create table if not exists recipe_history (
  id char(36) primary key,
  telegram_id bigint not null,
  request_data json not null,
  response_data json null,
  gigachat_usage json null,
  created_at datetime not null default current_timestamp,
  key idx_recipe_history_user (telegram_id),
  constraint fk_recipe_history_user
    foreign key (telegram_id) references users(telegram_id)
    on delete cascade
);

create index if not exists idx_user_ingredients_user on user_ingredients (telegram_id);
