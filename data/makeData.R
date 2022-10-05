### Script to prepare datasets needed for feature

library(tidyverse)
library(readxl)
library(sf)
library(BAMMtools)


### Prepare racial composition data
us_comp <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/usa_racial_compositions.csv") %>%
  rename("geo_name" = nation)

state_comp <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/state_racial_compositions.csv")

state_mapping <- select(state_comp, `state full name`, `state code`, `state name`)
  
state_comp <- state_comp %>%
  select(-`state name`) %>%
  rename("geo_name" = `state full name`,
         "geo_id" = `state code`)

# city_comp <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/city_racial_compositions.csv") %>%
#   select(-`state code`, -`state name`) %>%
#   rename("geo_name" = `city name`)

puma_comp <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/puma_racial_compositions_final_v2.csv") %>%
  select(-puma, -`state code`, -`city_name`, -state) %>%
  rename("geo_name" = `puma10_name`,
         "geo_id" = state_puma)

racial_comp_data <- bind_rows(us_comp, state_comp, puma_comp) %>%
  pivot_longer(cols = `AAPI, non-Hispanic`:`white, non-Hispanic`,
               names_to = "race",
               values_to = "share") %>%
  mutate(share = as.numeric(str_sub(share, 1, str_length(share) - 1)) / 100) %>%
  filter(race != 'other, non-Hispanic') %>%
  mutate(race = case_when(
    race == "AAPI, non-Hispanic" ~ "AAPI",
    race == "black, non-Hispanic" ~ "Black",
    race == "Hispanic or Latino" ~ "Hispanic",
    race == "white, non-Hispanic" ~ "White"
  ))

write_csv(racial_comp_data, "racial_comp_data.csv")




### Prepare metrics data
us_asset <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/usa_asset.csv") %>%
  mutate(geo_level = "nation")

us_credit <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/usa_credit.csv") %>%
  mutate(geo_level = "nation")

state_asset <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/state_asset.csv", 
                        na = "NA") %>%
  rename(geo_name = `state full name`, geo_id = `state code`, state_abbv = `state name`) %>%
  mutate(geo_level = "state")

state_credit <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/state_credit_final.csv",
                         na = c("n/a*", "")) %>%
  rename(geo_id = `State code`, state_abbv = `State name`) %>%
  mutate(geo_level = "state")

city_asset <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/city_asset.csv",
                       na = "NA") %>%
  rename(geo_name = `city name`, 
         `at least $2000 emergency savings_non-white` = `at least $2000 emergency savings_non_white`,
         `median_net_worth_non-white` = `median_net_worth_non_white`
         ) %>%
  select(-`state code`, -`state name`) %>%
  mutate(geo_level = "city")

city_credit <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/city_credit.csv",
                        na = c("", "n/a*")) %>%
  rename(geo_name = `City name`) %>%
  select(-`State code`, -`State name`) %>% 
  mutate(geo_name = replace(geo_name, geo_name == "Forth Worth, TX", "Fort Worth, TX")) %>%
  mutate(geo_name = replace(geo_name, geo_name == "Minneapolis", "Minneapolis, MN")) %>%
  mutate(geo_name = replace(geo_name, geo_name == "Corpus Christi", "Corpus Christi, TX")) %>%
  mutate(geo_level = "city")

puma <- read_csv("source/final_financial_health_and_wealth_dashboard_results_2022/puma_v2.csv",
                 na = c("NA", "", "n/a*"),
                 ) %>%
  rename(`median net worth` = median_net_worth,
         `at least 2000 emergency savings` = `share_of_households_with_at_least_$2000_emergency_savings`,
         has_delinq_pct = share_of_people_with_delinquent_debt,
         score_cleanpos_p50 = median_credit_score,
         had_foreclosure_2yr_pct = share_of_mortgage_holders_with_home_foreclosure) %>%
  select(-`_merge`)

# fix capitalization of state names
state_credit_w_name <- state_credit %>%
  left_join(state_mapping, by = c("geo_id" = "state code")) %>%
  select(-state_abbv, -`state name`, geo_name = `state full name`)

state_asset_w_name <- state_asset %>%
  left_join(state_mapping, by = c("geo_id" = "state code")) %>%
  select(-geo_name, -`state name`, geo_name = `state full name`)

emergency_savings <- us_asset %>%
  rename(geo_name = nation) %>%
  bind_rows(state_asset_w_name) %>%
  bind_rows(city_asset) %>%
  select(geo_name, geo_id, geo_level, contains("at least $2000 emergency savings")) %>%
  pivot_longer(cols = `at least $2000 emergency savings_all`:`at least $2000 emergency savings_non-white`,
               names_to = "metric") %>%
  separate(metric, into = c("metric", "race"), sep = "_")

median_net_worth <- us_asset %>%
  rename(geo_name = nation) %>%
  bind_rows(state_asset_w_name) %>%
  bind_rows(city_asset) %>%
  select(geo_name, geo_id, geo_level, contains("median_net_worth")) %>%
  pivot_longer(cols = `median_net_worth_all`:`median_net_worth_non-white`,
               names_to = "metric") %>%
  separate(metric, into = c("metric", "race"), sep = "median_net_worth") %>%
  mutate(metric = "median net worth",
         race = str_sub(race, 2))

credit_clean <- us_credit %>%
  rename(geo_name = nation) %>%
  bind_rows(state_credit_w_name) %>%
  bind_rows(city_credit) %>%
  pivot_longer(cols = `all has_delinq_pct`: `nonwhite had_foreclosure_2yr_pct`,
               names_to = "metric") %>%
  separate(metric, into = c("race", "metric"), sep = " ") %>%
  mutate(race = ifelse(race == "nonwhite", "non-white", race))

city_state_us_racial_metrics <- bind_rows(emergency_savings, median_net_worth, credit_clean) %>%
  mutate(metric = replace(metric, metric == "at least $2000 emergency savings", "at least 2000 emergency savings"))

puma_metrics <- puma %>%
  select(geo_id = state_puma, geo_name = puma10_name, `median net worth`:share_of_people_with_health_insurance) %>%
  pivot_longer(cols = `median net worth`:share_of_people_with_health_insurance,
               names_to = "metric") %>%
  mutate(geo_level = "PUMA")

# create dataset of all metrics by PUMA and metrics available for state and US
metrics_all <- city_state_us_racial_metrics %>%
  filter(race == "all",
         geo_level == "nation" | geo_level == "state") %>%
  select(-race) %>%
  bind_rows(puma_metrics) %>%
  mutate(value = round(value, digits = 4))

write_csv(metrics_all, "metrics_all.csv")


# create dataset for city bar charts of racial breakdowns by city, state and US
city_state_us_racial_metrics_final <- city_state_us_racial_metrics %>%
  filter(race != "others") %>%
  mutate(race = case_when(
    race == "all" ~ "Overall",
    race == "non-white" ~ "Residents of color (total)",
    race == "aapi" ~ "AAPI",
    race == "black" ~ "Black",
    race == "hispanic" ~ "Hispanic",
    race == "white" ~ "White"
  ))

write_csv(city_state_us_racial_metrics_final, "city_state_us_racial_metrics.csv")

# create dataset for searchbox
# need zip codes and all cities (with a numerical identifier for each city)
city_w_bonus_info <- city_state_us_racial_metrics_final %>%
  filter(geo_level == "city") %>%
  select(geo_name) %>%
  distinct() %>%
  mutate(has_bonus_info = 1)

# grab complete list of cities from the cities geojson file
cities_geojson <- st_read("source/cities.geojson") %>% # something wrong with this file: says it's WGS 84 but the coordinates don't look correct
  filter(!is.na(GEOID))

st_crs(cities_geojson)

cities <- cities_geojson %>% 
  as_tibble() %>%
  select(id = GEOID, label = IPUMS.CITY.Label) %>%
  mutate(geo_level = "City",
         id = as.numeric(id)) %>%
  left_join(city_w_bonus_info, by = c("label" = "geo_name")) %>%
  replace_na(list(has_bonus_info = 0)) %>%
  mutate(label = ifelse(has_bonus_info == 1, paste0(label, "*"), label))


zipcodes <- read_excel("source/puma_zipcode_crosswalk_v2.xlsx",
                       col_types = c("text", "numeric", "text", "numeric", "text", "text", "text", "text", "text", "numeric", "numeric"))

zipcodes_search <- zipcodes %>%
  filter(!(state %in% c("PR", "AS", "FM", "GU", "MH", "MP", "PW", "VI")) & !is.na(puma12name)) %>%
  select(zipcode) %>%
  distinct() %>%
  mutate(label = str_pad(zipcode, 5, pad = "0"),
         id = as.numeric(zipcode),
         geo_level = "Zipcode",
         has_bonus_info = 0) %>%
  select(-zipcode) %>%
  filter(!is.na(label))

search_data <- bind_rows(cities, zipcodes_search)

write_csv(search_data, "search_data.csv")

# create mapping of PUMA to city and to state
puma_city_state_mapping <- puma %>%
  select(puma_id = state_puma,
         state,
         state_id = statecode,
         puma_num = puma,
         puma_name = puma10_name,
         city = `city_name`) %>%
  left_join(state_mapping, by = c("state_id" = "state code")) %>%
  select(-state, state_name = `state full name`, state_abbv = `state name`) %>%
  left_join(city_w_bonus_info, by = c("city" = "geo_name"))

# add in cities that aren't associated with any PUMA
all_cities <- cities_geojson %>%
  as_tibble() %>%
  select(state_id = State.FIPS.Code,
         city = IPUMS.CITY.Label,
         state_name,
         state_abbv = STUSPS) %>%
  mutate(state_id = as.numeric(state_id))

cities_w_pumas <- puma_city_state_mapping %>%
  select(state_id, city, state_name, state_abbv) %>%
  distinct()

cities_no_pumas <- all_cities %>%
  anti_join(cities_w_pumas)

final_puma_city_mapping <- bind_rows(puma_city_state_mapping, cities_no_pumas)

write_csv(final_puma_city_mapping, "puma_city_state_mapping.csv")

# also need a mapping of PUMAs to zipcodes since we are now zooming into
# the PUMA mapped to the zip code rather than the zip code instead
# (this is due to there not being established mapped boundaries for zip codes)
pumas_zipcode <- zipcodes %>%
  filter(!(state %in% c("PR", "AS", "FM", "GU", "MH", "MP", "PW", "VI"))) %>%
  filter(state_puma != ".") %>%
  select(puma_id = state_puma, puma_name = puma12name, zipcode) %>%
  distinct() 

write_csv(pumas_zipcode, "pumas_zipcode.csv")




### MAKE GEOJSONS
st_crs(cities_geojson)

cities_4326 <- st_transform(cities_geojson, 4326) %>%
  select(id = GEOID, city = IPUMS.CITY.Label) %>%
  mutate(id = as.numeric(id))
st_crs(cities_4326)
st_write(cities_4326, "cities_4326.geojson", delete_dsn = T)

pumas_geojson <- st_read("source/pumas.geojson")
st_crs(pumas_geojson)
pumas_geojson <- mutate(pumas_geojson, id = as.numeric(GEOID10))

pumas_4326 <- st_transform(pumas_geojson, 4326) %>%
  mutate(id = as.numeric(GEOID10))

pumas_merged <- puma %>%
  right_join(pumas_geojson, by = c("state_puma" = "id")) %>%
  select(id = state_puma, puma10_name, `median net worth`:share_of_people_with_health_insurance, geometry) %>%
  mutate(`median net worth` = round(`median net worth`, digits = 0),
         homeownership_rate = round(homeownership_rate, digits = 2),
         `at least $2000 emergency savings` = round(`at least 2000 emergency savings`, digits = 2),
         has_delinq_pct = round(has_delinq_pct, digits = 2),
         share_of_student_loan_holders_with_delinquent_student_loans = round(share_of_student_loan_holders_with_delinquent_student_loans, digits = 2),
         had_foreclosure_2yr_pct = round(had_foreclosure_2yr_pct, digits = 4),
         share_of_low_income_households_with_housing_cost_burden = round(share_of_low_income_households_with_housing_cost_burden, digits = 2),
         share_of_people_with_health_insurance = round(share_of_people_with_health_insurance, digits = 2))

# convert merged tibble back into a spatial dataframe (need to do this so we can reproject the data)
pumas_merged_sf <- st_as_sf(pumas_merged)

# reproject both spatial dataframe to WGS84 / EPSG:4326 (needed for Mapbox)
pumas_merged_4326 <- st_transform(pumas_merged_sf, 4326)

# export merged dataset as a geojson file
st_write(pumas_merged_4326, "pumas_4326.geojson", delete_dsn = T)


# calculate color breaks for the map
color_breaks <- puma %>%
  select(`median net worth`:share_of_people_with_health_insurance) %>%
  lapply(function(x) getJenksBreaks(x, k = 6))

color_breaks_df <- as_tibble(color_breaks)
