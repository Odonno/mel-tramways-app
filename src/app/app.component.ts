import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NextDeparture } from './Model/NextDeparture';
import { Observable, BehaviorSubject, combineLatest, timer } from 'rxjs';
import { map, switchMap, refCount, publishReplay } from 'rxjs/operators';

const apiUrl = "https://asmelapi.azurewebsites.net/api/tramway/nextDepartures";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  nextDepartures$: Observable<NextDeparture[]>;
  stations$: Observable<string[]>;
  direction$ = new BehaviorSubject<string>("LILLE FLANDRES");
  search$ = new BehaviorSubject<string>("");
  searchedStations$: Observable<string[]>;
  selectedStation$: Observable<string | undefined>;
  displayedDepartures$: Observable<NextDeparture[]>;

  constructor(http: HttpClient) {
    this.nextDepartures$ = timer(0, 60 * 1000).pipe(
      switchMap(_ => http.get<NextDeparture[]>(apiUrl)),
      publishReplay(1),
      refCount()
    );

    this.stations$ = this.nextDepartures$.pipe(
      map(nextDepartures => {
        const stationsFromDepartures = nextDepartures.map(d => d.station || "");
        return [... new Set(stationsFromDepartures)];
      })
    );

    this.searchedStations$ = combineLatest(this.stations$, this.search$).pipe(
      map(([stations, search]) => {
        if (!search) {
          return [];
        }

        return stations
          .filter(station =>
            station.toLowerCase().includes(search.toLowerCase())
          );
      })
    );

    this.selectedStation$ =  this.searchedStations$.pipe(
      map(searchedStations => {
        if (searchedStations.length <= 0) {
          return undefined;
        }

        return searchedStations[0];
      })
    );

    this.displayedDepartures$ = combineLatest(this.nextDepartures$, this.selectedStation$, this.direction$).pipe(
      map(([nextDepartures, selectedStation, direction]) => {
        return nextDepartures
          .filter(d => d.station === selectedStation)
          .filter(d => {
            if (direction === "LILLE FLANDRES") {
              return d.direction === "LILLE FLANDRES";
            }

            return d.direction === "EUROTELEPORT" || d.direction === "TOURCOING CENTRE";
          });
      })
    );
  }

  invertDirection(currentDirection: string) {
    if (currentDirection === "LILLE FLANDRES") {
      this.direction$.next("ROUBAIX/TOURCOING");
    } else {
      this.direction$.next("LILLE FLANDRES");
    }
  }

  onSearch(event: any) {
    this.search$.next(event.target.value);
  }
}
