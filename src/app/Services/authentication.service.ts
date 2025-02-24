import { Router } from '@angular/router';
import { IUserData, userdb } from './../core/entity/user/user.module';
import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { user } from '../core/entity/user/user.module';
import {
  browserSessionPersistence,
  getAuth,
  getIdToken,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { myStorage } from '../auth/my-storage/my-storage.module';
import jwtDecode from 'jwt-decode';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  getauth = getAuth();
  response: boolean;
  currentUserSubject: BehaviorSubject<IUserData>;
  userData: IUserData;

  constructor(private auth: Auth, private firebase: FirebaseService, private router: Router) {
    this.response = false;
    this.userData = {
      name: '',
      email: '',
      uid: '',
      roles: '',
      lastName: '',
    };
    this.currentUserSubject = new BehaviorSubject<IUserData>(this.userData);
  }

  login({ email, password }: user) {
    return setPersistence(this.getauth, browserSessionPersistence).then(() => {
      return signInWithEmailAndPassword(this.auth, email, password).then(() => {
        onAuthStateChanged(getAuth(), (user: any) => {
          if (user) {
            myStorage.setItem('RedcalAccessToken', user['accessToken']);
            const decoded = jwtDecode<any>(
              myStorage.getItem('RedcalAccessToken')
            );
            this.firebase.getUser('user', decoded.sub).subscribe((res) => {
              this.currentUserSubject.next(res);
              this.router.navigate(['/home']);
            });
            
          }
        });
      });
    });
  }

  get currentUserValue() {
    return this.currentUserSubject;
  }

  forgotPassword(emailAddress:string){
    return sendPasswordResetEmail(this.auth, emailAddress).then(function() { 
      // Correo electrónico enviado. 
      return 'Revise su correo electronico y siga los pasos.'; 
    });
  }

  register({ email, password, name, lastName }: user) {
    return createUserWithEmailAndPassword(this.auth, email, password).then(
      () => {
        onAuthStateChanged(getAuth(), (user) => {
          if (user) {
            const User: userdb = {
              email: email,
              name: name,
              lastName: lastName,
              roles: 'user',
              uid: user.uid,
            };
            this.firebase.create(User);
          }
        });
      }
    );
  }

  logout() {
    myStorage.clear();
    const userData = {
      name: '',
      email: '',
      uid: '',
      roles: '',
      lastName: '',
    };
    this.currentUserSubject.next(userData);
    return signOut(this.auth).then(()=>{
      
    });
  }


  hasRoles(rol: string[]): boolean {
    if (!myStorage || !myStorage.getItem('RedcalAccessToken')) {
      return false;
    }
    const decoded = jwtDecode<any>(myStorage.getItem('RedcalAccessToken'));
    const response: any = this.firebase
      .getUser('user', decoded.sub)
      .subscribe((res) => {
        this.response = !!(
          decoded && rol.some((element) => (element = res[0].roles))
        );
        return response;
      });
    return response;
  }

  isAuthenticated(): boolean {
    if (myStorage.getItem('RedcalAccessToken')) {
      return true;
    }
    return false;
  }
}
